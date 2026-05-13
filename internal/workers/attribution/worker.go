package attribution

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	"github.com/google/uuid"
	"github.com/indica-ai/indica-ai/internal/domain/rules"
	"github.com/indica-ai/indica-ai/internal/domain/tracking"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Worker handles referral attribution and anti-fraud checks.
type Worker struct {
	pool   *pgxpool.Pool
	engine *rules.Engine
}

// NewWorker creates a new attribution worker.
func NewWorker(pool *pgxpool.Pool, engine *rules.Engine) *Worker {
	return &Worker{pool: pool, engine: engine}
}

// AttributeReferralJobInput is the input for the attribution job.
type AttributeReferralJobInput struct {
	ReferralID uuid.UUID `json:"referral_id"`
	LeadID     uuid.UUID `json:"lead_id"`
	TenantID   uuid.UUID `json:"tenant_id"`
	ProgramID  uuid.UUID `json:"program_id"`
	PartnerID  uuid.UUID `json:"partner_id"`
	VisitorID  string    `json:"visitor_id,omitempty"`
	Fingerprint string  `json:"fingerprint,omitempty"`
	PhoneHash  string    `json:"phone_hash,omitempty"`
}

// Process runs the attribution job with anti-fraud checks.
func (w *Worker) Process(ctx context.Context, input []byte) error {
	var job AttributeReferralJobInput
	if err := json.Unmarshal(input, &job); err != nil {
		return fmt.Errorf("unmarshal job: %w", err)
	}

	slog.Info("processing attribution",
		"referral_id", job.ReferralID,
		"partner_id", job.PartnerID,
		"lead_id", job.LeadID,
	)

	// === Anti-fraud check 1: Auto-referral ===
	// Compare partner's phone_hash with lead's phone_hash
	var partnerPhoneHash string
	err := w.pool.QueryRow(ctx,
		`SELECT phone_hash FROM partners WHERE id = $1`, job.PartnerID).Scan(&partnerPhoneHash)
	if err == nil && partnerPhoneHash != "" && partnerPhoneHash == job.PhoneHash {
		slog.Warn("auto-referral detected",
			"partner_id", job.PartnerID,
			"referral_id", job.ReferralID,
		)
		// Mark as blocked
		w.pool.Exec(ctx,
			`UPDATE referrals SET attribution_score = 0, updated_at = now() WHERE id = $1`,
			job.ReferralID)
		w.insertAuditLog(ctx, job.TenantID, "fraud.flag", "referral", job.ReferralID,
			map[string]interface{}{"reason": "auto_referral", "score": 0})
		return nil
	}

	// === Attribution by code (highest confidence) ===
	score := 0.0
	matchedBy := "manual"
	var clickID *uuid.UUID

	// Check for click events matching visitor_id or fingerprint
	if job.VisitorID != "" || job.Fingerprint != "" {
		var windowDays int
		w.pool.QueryRow(ctx,
			`SELECT (rules->>'attribution_window_days')::int FROM programs WHERE id = $1`,
			job.ProgramID).Scan(&windowDays)
		if windowDays <= 0 {
			windowDays = 30
		}

		windowStart := time.Now().AddDate(0, 0, -windowDays)

		rows, err := w.pool.Query(ctx,
			`SELECT id, visitor_id, fingerprint FROM click_events
			 WHERE tenant_id = $1 AND program_id = $2
			   AND (visitor_id::text = $3 OR fingerprint = $4)
			   AND occurred_at >= $5
			 ORDER BY occurred_at DESC LIMIT 1`,
			job.TenantID, job.ProgramID, job.VisitorID, job.Fingerprint, windowStart)
		if err == nil && rows.Next() {
			var ceID uuid.UUID
			var ceVisitorID uuid.UUID
			var ceFingerprint string
			rows.Scan(&ceID, &ceVisitorID, &ceFingerprint)
			rows.Close()

			clickID = &ceID

			if job.VisitorID != "" && ceVisitorID.String() == job.VisitorID {
				score = tracking.ScoreCookieMatch // 0.85
				matchedBy = "cookie"
			} else {
				score = tracking.ScoreFingerprintMatch // 0.4
				matchedBy = "fingerprint"
			}
		} else {
			if rows != nil {
				rows.Close()
			}
		}
	}

	// If score < 0.5, mark for manual review
	if score < tracking.ScoreManualReviewThreshold && score > 0 {
		slog.Info("low confidence attribution, manual review needed",
			"referral_id", job.ReferralID,
			"score", score,
			"matched_by", matchedBy,
		)
	}

	// === Anti-fraud check 2: Click farm detection ===
	if job.PartnerID != uuid.Nil {
		var totalClicks, uniqueVisitors int64
		hourAgo := time.Now().Add(-1 * time.Hour)
		w.pool.QueryRow(ctx,
			`SELECT COUNT(*), COUNT(DISTINCT visitor_id)
			 FROM click_events WHERE partner_id = $1 AND occurred_at >= $2`,
			job.PartnerID, hourAgo).Scan(&totalClicks, &uniqueVisitors)

		if totalClicks > 100 && uniqueVisitors > 0 {
			ratio := float64(uniqueVisitors) / float64(totalClicks)
			if ratio < 0.1 {
				slog.Warn("possible click farm",
					"partner_id", job.PartnerID,
					"total_clicks", totalClicks,
					"unique_visitors", uniqueVisitors,
					"ratio", ratio,
				)
				w.insertAuditLog(ctx, job.TenantID, "fraud.flag", "partner", job.PartnerID,
					map[string]interface{}{"reason": "click_farm", "ratio": ratio})
			}
		}
	}

	// Create attribution record
	attrID := uuid.New()
	_, err = w.pool.Exec(ctx,
		`INSERT INTO attributions (id, tenant_id, referral_id, partner_id, click_id, model, score, matched_by)
		 VALUES ($1, $2, $3, $4, $5, 'last_touch', $6, $7)`,
		attrID, job.TenantID, job.ReferralID, job.PartnerID, clickID, score, matchedBy)
	if err != nil {
		return fmt.Errorf("insert attribution: %w", err)
	}

	// Update referral with attribution score
	_, err = w.pool.Exec(ctx,
		`UPDATE referrals SET attribution_score = $1, attributed_at = now(), updated_at = now()
		 WHERE id = $2`,
		score, job.ReferralID)
	if err != nil {
		return fmt.Errorf("update referral: %w", err)
	}

	slog.Info("attribution completed",
		"referral_id", job.ReferralID,
		"score", score,
		"matched_by", matchedBy,
	)

	return nil
}

// EvaluateRulesJobInput is the input for rule evaluation.
type EvaluateRulesJobInput struct {
	ReferralID uuid.UUID `json:"referral_id"`
	SaleID     uuid.UUID `json:"sale_id"`
	TenantID   uuid.UUID `json:"tenant_id"`
}

// EvaluateRules evaluates rules for a referral and creates a reward.
func (w *Worker) EvaluateRules(ctx context.Context, input []byte) error {
	var job EvaluateRulesJobInput
	if err := json.Unmarshal(input, &job); err != nil {
		return fmt.Errorf("unmarshal job: %w", err)
	}

	// Get referral with rule snapshot
	var ruleSnapshot json.RawMessage
	var partnerID, programID uuid.UUID
	var splitChoice json.RawMessage
	err := w.pool.QueryRow(ctx,
		`SELECT partner_id, program_id, rule_snapshot, split_choice
		 FROM referrals WHERE id = $1 FOR UPDATE`,
		job.ReferralID).Scan(&partnerID, &programID, &ruleSnapshot, &splitChoice)
	if err != nil {
		return fmt.Errorf("get referral: %w", err)
	}

	// Parse rule
	rule, err := rules.ParseRuleSchema(ruleSnapshot)
	if err != nil {
		return fmt.Errorf("parse rule: %w", err)
	}

	// Get sale amount
	var saleAmount int64
	w.pool.QueryRow(ctx,
		`SELECT amount_cents FROM sales WHERE id = $1`, job.SaleID).Scan(&saleAmount)

	// Create event
	event := &rules.Event{
		Type:        rule.Trigger,
		SaleAmount:  saleAmount,
		LeadStatus:  "closed",
		PartnerID:   partnerID.String(),
		ReferralID:  job.ReferralID.String(),
		SaleID:      job.SaleID.String(),
		ProgramID:   programID.String(),
		TenantID:    job.TenantID.String(),
		SplitChoice: splitChoice,
	}

	// Evaluate
	outcome, err := w.engine.Evaluate(rule, event)
	if err != nil {
		return fmt.Errorf("evaluate rules: %w", err)
	}

	// Create reward
	rewardID := uuid.New()
	partnerUUID, _ := uuid.Parse(outcome.PartnerID)
	referralUUID, _ := uuid.Parse(outcome.ReferralID)
	programUUID, _ := uuid.Parse(outcome.ProgramID)
	tenantUUID, _ := uuid.Parse(outcome.TenantID)
	saleUUID, _ := uuid.Parse(outcome.SaleID)

	_, err = w.pool.Exec(ctx,
		`INSERT INTO rewards (id, tenant_id, program_id, referral_id, partner_id, sale_id, type, amount_cents, currency, status, metadata)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
		rewardID, tenantUUID, programUUID, referralUUID, partnerUUID, saleUUID,
		outcome.Type, outcome.AmountCents, outcome.Currency, outcome.Status, outcome.Metadata)
	if err != nil {
		return fmt.Errorf("insert reward: %w", err)
	}

	slog.Info("reward created",
		"reward_id", rewardID,
		"type", outcome.Type,
		"amount_cents", outcome.AmountCents,
	)

	return nil
}

func (w *Worker) insertAuditLog(ctx context.Context, tenantID uuid.UUID, action, entityType string, entityID uuid.UUID, metadata map[string]interface{}) {
	metaJSON, _ := json.Marshal(metadata)
	w.pool.Exec(ctx,
		`INSERT INTO audit_log (id, tenant_id, action, entity_type, entity_id, metadata)
		 VALUES ($1, $2, $3, $4, $5, $6)`,
		uuid.New(), tenantID, action, entityType, entityID, metaJSON)
}
