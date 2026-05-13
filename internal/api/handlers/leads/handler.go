// Package leads owns the tenant-admin view of leads — listing, filtering and
// transitioning their status. Partner-initiated lead creation lives in the
// partners package (CreateLead), the two flows share the same underlying
// table but have different auth/role expectations.
package leads

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/indica-ai/indica-ai/internal/platform/db"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Handler exposes admin lead operations.
type Handler struct {
	pool *pgxpool.Pool
}

func New(pool *pgxpool.Pool) *Handler {
	return &Handler{pool: pool}
}

// leadResponse mirrors the frontend `Lead` interface
// (web/apps/dashboard/app/lib/api.ts).
type leadResponse struct {
	ID              uuid.UUID  `json:"id"`
	Name            *string    `json:"name"`
	PhoneE164       *string    `json:"phone_e164"`
	Email           *string    `json:"email"`
	Status          string     `json:"status"`
	Source          string     `json:"source"`
	Notes           *string    `json:"notes"`
	ClosedAt        *time.Time `json:"closed_at"`
	CreatedAt       time.Time  `json:"created_at"`
	ProgramID       uuid.UUID  `json:"program_id"`
	ProgramName     string     `json:"program_name"`
	PartnerID       *uuid.UUID `json:"partner_id"`
	PartnerName     *string    `json:"partner_name"`
	SaleAmountCents *int64     `json:"sale_amount_cents"`
}

const leadSelectClause = `
SELECT
    l.id, l.name, l.phone_e164, l.email, l.status, l.source, l.notes, l.closed_at, l.created_at,
    l.program_id, prog.name,
    ref.partner_id, pa.name,
    (SELECT amount_cents FROM sales WHERE lead_id = l.id ORDER BY created_at DESC LIMIT 1)
  FROM leads l
  JOIN programs prog ON prog.id = l.program_id
  LEFT JOIN referrals ref ON ref.id = l.referral_id
  LEFT JOIN partners pa ON pa.id = ref.partner_id`

// List handles GET /api/leads?status=...
func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	tid, _ := db.GetTenantID(r.Context())
	tenantID, _ := uuid.Parse(tid)

	status := r.URL.Query().Get("status")
	query := leadSelectClause + ` WHERE l.tenant_id = $1`
	args := []interface{}{tenantID}
	if status != "" {
		query += ` AND l.status = $2`
		args = append(args, status)
	}
	query += ` ORDER BY l.created_at DESC LIMIT 200`

	rows, err := h.pool.Query(r.Context(), query, args...)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list leads")
		return
	}
	defer rows.Close()

	out := make([]leadResponse, 0)
	for rows.Next() {
		var l leadResponse
		if err := rows.Scan(
			&l.ID, &l.Name, &l.PhoneE164, &l.Email, &l.Status, &l.Source, &l.Notes, &l.ClosedAt, &l.CreatedAt,
			&l.ProgramID, &l.ProgramName,
			&l.PartnerID, &l.PartnerName,
			&l.SaleAmountCents,
		); err != nil {
			continue
		}
		out = append(out, l)
	}
	writeJSON(w, http.StatusOK, out)
}

// UpdateStatus handles PATCH /api/leads/{id}/status.
// closed_at is bumped only on the closed/lost terminal states so the
// timestamp reflects the actual close event, not every transition.
func (h *Handler) UpdateStatus(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid lead id")
		return
	}
	var req struct {
		Status string `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	valid := map[string]bool{"new": true, "in_progress": true, "qualified": true, "closed": true, "lost": true}
	if !valid[req.Status] {
		writeError(w, http.StatusBadRequest, "invalid status")
		return
	}

	tid, _ := db.GetTenantID(r.Context())
	tenantID, _ := uuid.Parse(tid)

	closedExpr := "closed_at"
	if req.Status == "closed" || req.Status == "lost" {
		closedExpr = "COALESCE(closed_at, now())"
	}
	tag, err := h.pool.Exec(r.Context(),
		`UPDATE leads SET status = $1, closed_at = `+closedExpr+`, updated_at = now()
		 WHERE id = $2 AND tenant_id = $3`,
		req.Status, id, tenantID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update lead")
		return
	}
	if tag.RowsAffected() == 0 {
		writeError(w, http.StatusNotFound, "lead not found")
		return
	}

	// Return the fresh row so the client can reflect the new state without a re-fetch.
	row := h.pool.QueryRow(r.Context(), leadSelectClause+` WHERE l.id = $1`, id)
	var l leadResponse
	if err := row.Scan(
		&l.ID, &l.Name, &l.PhoneE164, &l.Email, &l.Status, &l.Source, &l.Notes, &l.ClosedAt, &l.CreatedAt,
		&l.ProgramID, &l.ProgramName,
		&l.PartnerID, &l.PartnerName,
		&l.SaleAmountCents,
	); err != nil && err != pgx.ErrNoRows {
		writeError(w, http.StatusInternalServerError, "failed to load updated lead")
		return
	}
	writeJSON(w, http.StatusOK, l)
}

func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}
