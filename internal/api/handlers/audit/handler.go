// Package audit exposes the tenant-admin view into audit_log and
// fraud_evaluations. Read-only — nothing in this package mutates rows.
package audit

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/google/uuid"
	"github.com/indica-ai/indica-ai/internal/platform/db"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Handler struct {
	pool *pgxpool.Pool
}

func New(pool *pgxpool.Pool) *Handler {
	return &Handler{pool: pool}
}

type auditEntry struct {
	ID         uuid.UUID       `json:"id"`
	UserID     *uuid.UUID      `json:"user_id"`
	UserEmail  *string         `json:"user_email"`
	Action     string          `json:"action"`
	EntityType string          `json:"entity_type"`
	EntityID   *uuid.UUID      `json:"entity_id"`
	OldValues  json.RawMessage `json:"old_values"`
	NewValues  json.RawMessage `json:"new_values"`
	IPAddress  *string         `json:"ip_address"`
	UserAgent  *string         `json:"user_agent"`
	Metadata   json.RawMessage `json:"metadata"`
	CreatedAt  time.Time       `json:"created_at"`
}

// List handles GET /api/audit-log?action=...&entity_type=...&since=...&limit=...
// Returns the most recent entries for the authenticated tenant. The query is
// always bounded to the last 90 days to prevent accidental table scans on
// large tenants — older entries live in cold storage (out of scope for MVP).
func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	tid, _ := db.GetTenantID(r.Context())
	tenantID, _ := uuid.Parse(tid)

	q := r.URL.Query()
	action := q.Get("action")
	entityType := q.Get("entity_type")
	limit, _ := strconv.Atoi(q.Get("limit"))
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	sinceParam := q.Get("since")
	since := time.Now().Add(-90 * 24 * time.Hour)
	if sinceParam != "" {
		if t, err := time.Parse(time.RFC3339, sinceParam); err == nil {
			since = t
		}
	}

	// Left-join users so the UI can show "leonardo@…" instead of just a UUID.
	rows, err := h.pool.Query(r.Context(),
		`SELECT a.id, a.user_id, u.email,
		        a.action, a.entity_type, a.entity_id,
		        COALESCE(a.old_values, 'null'::jsonb),
		        COALESCE(a.new_values, 'null'::jsonb),
		        host(a.ip_address), a.user_agent,
		        a.metadata, a.created_at
		   FROM audit_log a
		   LEFT JOIN users u ON u.id = a.user_id
		  WHERE a.tenant_id = $1
		    AND a.created_at >= $2
		    AND ($3 = '' OR a.action = $3)
		    AND ($4 = '' OR a.entity_type = $4)
		  ORDER BY a.created_at DESC
		  LIMIT $5`,
		tenantID, since, action, entityType, limit)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list audit log")
		return
	}
	defer rows.Close()

	out := make([]auditEntry, 0)
	for rows.Next() {
		var e auditEntry
		if err := rows.Scan(&e.ID, &e.UserID, &e.UserEmail, &e.Action, &e.EntityType, &e.EntityID,
			&e.OldValues, &e.NewValues, &e.IPAddress, &e.UserAgent, &e.Metadata, &e.CreatedAt); err != nil {
			continue
		}
		out = append(out, e)
	}
	writeJSON(w, http.StatusOK, out)
}

type fraudEvalEntry struct {
	ID          uuid.UUID       `json:"id"`
	PartnerID   uuid.UUID       `json:"partner_id"`
	PartnerName string          `json:"partner_name"`
	LeadID      *uuid.UUID      `json:"lead_id"`
	Score       int             `json:"score"`
	Action      string          `json:"action"`
	Signals     json.RawMessage `json:"signals"`
	Evidence    json.RawMessage `json:"evidence"`
	CreatedAt   time.Time       `json:"created_at"`
}

// FraudEvaluations handles GET /api/audit-log/fraud-evaluations.
// Dedicated path so the UI can render score + signals without re-parsing
// the audit_log metadata blob.
func (h *Handler) FraudEvaluations(w http.ResponseWriter, r *http.Request) {
	tid, _ := db.GetTenantID(r.Context())
	tenantID, _ := uuid.Parse(tid)

	q := r.URL.Query()
	action := q.Get("action") // ok | review | block
	limit, _ := strconv.Atoi(q.Get("limit"))
	if limit <= 0 || limit > 200 {
		limit = 50
	}

	rows, err := h.pool.Query(r.Context(),
		`SELECT fe.id, fe.partner_id, p.name, fe.lead_id, fe.score, fe.action,
		        fe.signals, fe.evidence, fe.created_at
		   FROM fraud_evaluations fe
		   JOIN partners p ON p.id = fe.partner_id
		  WHERE fe.tenant_id = $1
		    AND ($2 = '' OR fe.action = $2)
		  ORDER BY fe.created_at DESC
		  LIMIT $3`,
		tenantID, action, limit)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list fraud evaluations")
		return
	}
	defer rows.Close()

	out := make([]fraudEvalEntry, 0)
	for rows.Next() {
		var e fraudEvalEntry
		if err := rows.Scan(&e.ID, &e.PartnerID, &e.PartnerName, &e.LeadID, &e.Score, &e.Action,
			&e.Signals, &e.Evidence, &e.CreatedAt); err != nil {
			continue
		}
		out = append(out, e)
	}
	writeJSON(w, http.StatusOK, out)
}

// Summary handles GET /api/audit-log/summary — counts the last 30 days by
// action so the dashboard can render the "what's been happening" widget.
func (h *Handler) Summary(w http.ResponseWriter, r *http.Request) {
	tid, _ := db.GetTenantID(r.Context())
	tenantID, _ := uuid.Parse(tid)

	var summary struct {
		TotalEntries    int64            `json:"total_entries"`
		FraudOK         int64            `json:"fraud_ok"`
		FraudReview     int64            `json:"fraud_review"`
		FraudBlock      int64            `json:"fraud_block"`
		Last7Days       int64            `json:"entries_last_7_days"`
		Last30Days      int64            `json:"entries_last_30_days"`
		TopActions      []actionCount    `json:"top_actions"`
	}

	// One round-trip for the counters + a second for the top actions —
	// keeps each query small enough to use the existing tenant indexes.
	err := h.pool.QueryRow(r.Context(),
		`SELECT
		    COUNT(*) FILTER (WHERE created_at >= now() - INTERVAL '90 days'),
		    COUNT(*) FILTER (WHERE created_at >= now() - INTERVAL '7 days'),
		    COUNT(*) FILTER (WHERE created_at >= now() - INTERVAL '30 days')
		  FROM audit_log WHERE tenant_id = $1`,
		tenantID).Scan(&summary.TotalEntries, &summary.Last7Days, &summary.Last30Days)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to summarize")
		return
	}

	// Fraud action counts from fraud_evaluations.
	h.pool.QueryRow(r.Context(),
		`SELECT
		    COUNT(*) FILTER (WHERE action = 'ok'),
		    COUNT(*) FILTER (WHERE action = 'review'),
		    COUNT(*) FILTER (WHERE action = 'block')
		  FROM fraud_evaluations WHERE tenant_id = $1 AND created_at >= now() - INTERVAL '30 days'`,
		tenantID).Scan(&summary.FraudOK, &summary.FraudReview, &summary.FraudBlock)

	tcRows, err := h.pool.Query(r.Context(),
		`SELECT action, COUNT(*) FROM audit_log
		  WHERE tenant_id = $1 AND created_at >= now() - INTERVAL '30 days'
		  GROUP BY action ORDER BY 2 DESC LIMIT 10`,
		tenantID)
	if err == nil {
		defer tcRows.Close()
		summary.TopActions = make([]actionCount, 0, 10)
		for tcRows.Next() {
			var ac actionCount
			if err := tcRows.Scan(&ac.Action, &ac.Count); err == nil {
				summary.TopActions = append(summary.TopActions, ac)
			}
		}
	}

	writeJSON(w, http.StatusOK, summary)
}

type actionCount struct {
	Action string `json:"action"`
	Count  int64  `json:"count"`
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}
