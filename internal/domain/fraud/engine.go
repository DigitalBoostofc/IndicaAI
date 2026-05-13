package fraud

import (
	"context"
	"encoding/json"
	"log/slog"
	"net"
	"time"

	"github.com/google/uuid"
)

// Engine orchestrates all fraud signals and produces a decision.
type Engine struct {
	querier Querier
	logger  *slog.Logger
}

// NewEngine creates a new fraud engine.
func NewEngine(querier Querier, logger *slog.Logger) *Engine {
	return &Engine{
		querier: querier,
		logger:  logger,
	}
}

// Check evaluates all fraud signals for a lead creation request.
// Returns the result and any error. On error, the caller should fail-open (log and continue).
func (e *Engine) Check(ctx context.Context, input LeadCreationInput) (*Result, error) {
	type signalResult struct {
		signal Signal
	}

	signals := make([]Signal, 0, 6)

	// Run signals sequentially (each is a lightweight DB query).
	// For MVP simplicity, sequential is fine. Parallelize when latency matters.
	if pts, ev := checkSelfReferral(ctx, e.querier, input.PartnerID, input.TenantID, input.PhoneHash, input.EmailHash); pts > 0 {
		signals = append(signals, Signal{Name: "self_referral", Points: pts, Evidence: ev})
	}
	if pts, ev := checkVelocity(ctx, e.querier, input.PartnerID, input.TenantID, input.Now); pts > 0 {
		signals = append(signals, Signal{Name: "velocity", Points: pts, Evidence: ev})
	}
	if pts, ev := checkPhoneDedup(ctx, e.querier, input.PartnerID, input.TenantID, input.PhoneHash, input.Now); pts > 0 {
		signals = append(signals, Signal{Name: "phone_dedup", Points: pts, Evidence: ev})
	}
	if pts, ev := checkClickVelocity(ctx, e.querier, input.PartnerID, input.TenantID, input.Now); pts > 0 {
		signals = append(signals, Signal{Name: "click_velocity", Points: pts, Evidence: ev})
	}
	if pts, ev := checkIPUADup(ctx, e.querier, input.PartnerID, input.TenantID, input.Now); pts > 0 {
		signals = append(signals, Signal{Name: "ip_ua_dup", Points: pts, Evidence: ev})
	}
	if pts, ev := checkImprobableHours(ctx, e.querier, input.Now); pts > 0 {
		signals = append(signals, Signal{Name: "improbable_hours", Points: pts, Evidence: ev})
	}

	// Sum score
	score := 0
	for _, s := range signals {
		score += s.Points
	}

	// Determine action
	action := ActionOK
	if score >= 61 {
		action = ActionBlock
	} else if score >= 31 {
		action = ActionReview
	}

	// Build combined evidence
	evidence := make(map[string]any, len(signals)+3)
	evidence["score"] = score
	evidence["action"] = string(action)
	evidence["signal_count"] = len(signals)
	for _, s := range signals {
		evidence[s.Name] = s.Evidence
	}

	return &Result{
		Score:    score,
		Action:   action,
		Signals:  signals,
		Evidence: evidence,
	}, nil
}

// LogAudit inserts a fraud_check entry into the audit_log table.
// This is a best-effort operation — failures are logged but not returned.
func LogAudit(ctx context.Context, q Querier, logger *slog.Logger,
	tenantID, partnerID uuid.UUID, result *Result, ip net.IP, userAgent string) {

	if result == nil {
		return
	}

	metadata, err := json.Marshal(map[string]any{
		"score":    result.Score,
		"action":   string(result.Action),
		"signals":  result.Signals,
		"evidence": result.Evidence,
	})
	if err != nil {
		logger.Warn("failed to marshal fraud audit metadata", "error", err)
		return
	}

	var ipVal any
	if ip != nil {
		ipVal = ip.String()
	}

	err = q.QueryRow(ctx,
		`INSERT INTO audit_log (tenant_id, action, entity_type, entity_id, ip_address, user_agent, metadata, created_at)
		 VALUES ($1, 'fraud_check', 'lead_creation', $2, $3, $4, $5, $6)
		 RETURNING id`,
		tenantID, partnerID, ipVal, userAgent, metadata, time.Now(),
	).Scan(new(uuid.UUID))
	if err != nil {
		logger.Warn("failed to insert fraud audit log", "error", err)
	}
}

// AttributionScoreFor returns the attribution_score to use when inserting a referral.
// Returns 1.0 for OK, 0.3 for review, 0.0 for block.
func AttributionScoreFor(action Action) float64 {
	switch action {
	case ActionReview:
		return 0.3
	case ActionBlock:
		return 0.0
	default:
		return 1.0
	}
}
