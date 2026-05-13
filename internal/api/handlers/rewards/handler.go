// Package rewards owns the tenant-admin view of rewards: listing, summary,
// and approval/rejection. Partner-facing wallet/payouts live elsewhere.
package rewards

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/indica-ai/indica-ai/internal/api/middleware"
	"github.com/indica-ai/indica-ai/internal/platform/db"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Handler struct {
	pool *pgxpool.Pool
}

func New(pool *pgxpool.Pool) *Handler {
	return &Handler{pool: pool}
}

// rewardResponse mirrors the frontend `Reward` interface.
type rewardResponse struct {
	ID             uuid.UUID  `json:"id"`
	Type           string     `json:"type"`
	AmountCents    int64      `json:"amount_cents"`
	Currency       string     `json:"currency"`
	Status         string     `json:"status"`
	ApprovedAt     *time.Time `json:"approved_at"`
	RejectedReason *string    `json:"rejected_reason"`
	CreatedAt      time.Time  `json:"created_at"`
	ProgramID      uuid.UUID  `json:"program_id"`
	ProgramName    string     `json:"program_name"`
	PartnerID      uuid.UUID  `json:"partner_id"`
	PartnerName    string     `json:"partner_name"`
	LeadName       *string    `json:"lead_name"`
}

const rewardSelectClause = `
SELECT
    rw.id, rw.type, rw.amount_cents, rw.currency, rw.status,
    rw.approved_at, rw.rejected_reason, rw.created_at,
    rw.program_id, prog.name,
    rw.partner_id, pa.name,
    (SELECT l.name FROM leads l WHERE l.referral_id = rw.referral_id LIMIT 1)
  FROM rewards rw
  JOIN programs prog ON prog.id = rw.program_id
  JOIN partners pa ON pa.id = rw.partner_id`

// List handles GET /api/rewards?status=...
func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	tid, _ := db.GetTenantID(r.Context())
	tenantID, _ := uuid.Parse(tid)

	status := r.URL.Query().Get("status")
	query := rewardSelectClause + ` WHERE rw.tenant_id = $1`
	args := []interface{}{tenantID}
	if status != "" {
		query += ` AND rw.status = $2`
		args = append(args, status)
	}
	query += ` ORDER BY rw.created_at DESC LIMIT 200`

	rows, err := h.pool.Query(r.Context(), query, args...)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list rewards")
		return
	}
	defer rows.Close()

	out := make([]rewardResponse, 0)
	for rows.Next() {
		var rr rewardResponse
		if err := rows.Scan(
			&rr.ID, &rr.Type, &rr.AmountCents, &rr.Currency, &rr.Status,
			&rr.ApprovedAt, &rr.RejectedReason, &rr.CreatedAt,
			&rr.ProgramID, &rr.ProgramName,
			&rr.PartnerID, &rr.PartnerName,
			&rr.LeadName,
		); err != nil {
			continue
		}
		out = append(out, rr)
	}
	writeJSON(w, http.StatusOK, out)
}

// Summary handles GET /api/rewards/summary — bucket counts for the
// dashboard sidebar/header.
func (h *Handler) Summary(w http.ResponseWriter, r *http.Request) {
	tid, _ := db.GetTenantID(r.Context())
	tenantID, _ := uuid.Parse(tid)

	var s struct {
		Pending   int64 `json:"pending"`
		Approved  int64 `json:"approved"`
		Paid      int64 `json:"paid"`
		Rejected  int64 `json:"rejected"`
		Cancelled int64 `json:"cancelled"`
	}
	err := h.pool.QueryRow(r.Context(),
		`SELECT
		    COUNT(*) FILTER (WHERE status = 'pending'),
		    COUNT(*) FILTER (WHERE status = 'approved'),
		    COUNT(*) FILTER (WHERE status = 'paid'),
		    COUNT(*) FILTER (WHERE status = 'rejected'),
		    COUNT(*) FILTER (WHERE status = 'cancelled')
		 FROM rewards WHERE tenant_id = $1`,
		tenantID).Scan(&s.Pending, &s.Approved, &s.Paid, &s.Rejected, &s.Cancelled)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to summarize rewards")
		return
	}
	writeJSON(w, http.StatusOK, s)
}

// Approve handles PATCH /api/rewards/{id}/approve. Stamps approver and
// approval timestamp so payouts can later sort by hold-expiry.
func (h *Handler) Approve(w http.ResponseWriter, r *http.Request) {
	id, ok := parseID(w, r)
	if !ok {
		return
	}
	tid, _ := db.GetTenantID(r.Context())
	tenantID, _ := uuid.Parse(tid)
	approver, _ := middleware.ClaimsFromContext(r.Context())

	tag, err := h.pool.Exec(r.Context(),
		`UPDATE rewards
		    SET status = 'approved', approved_at = now(), approved_by = $1,
		        rejected_reason = NULL, updated_at = now()
		  WHERE id = $2 AND tenant_id = $3 AND status = 'pending'`,
		approver.UserID, id, tenantID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to approve")
		return
	}
	if tag.RowsAffected() == 0 {
		writeError(w, http.StatusConflict, "reward not in pending state or not found")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "approved"})
}

// Reject handles PATCH /api/rewards/{id}/reject with `{reason: string}`.
func (h *Handler) Reject(w http.ResponseWriter, r *http.Request) {
	id, ok := parseID(w, r)
	if !ok {
		return
	}
	var req struct {
		Reason string `json:"reason"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	tid, _ := db.GetTenantID(r.Context())
	tenantID, _ := uuid.Parse(tid)
	tag, err := h.pool.Exec(r.Context(),
		`UPDATE rewards
		    SET status = 'rejected', rejected_reason = $1, updated_at = now()
		  WHERE id = $2 AND tenant_id = $3 AND status IN ('pending', 'approved')`,
		req.Reason, id, tenantID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to reject")
		return
	}
	if tag.RowsAffected() == 0 {
		writeError(w, http.StatusConflict, "reward not in a rejectable state or not found")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "rejected"})
}

func parseID(w http.ResponseWriter, r *http.Request) (uuid.UUID, bool) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid reward id")
		return uuid.Nil, false
	}
	return id, true
}

func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}
