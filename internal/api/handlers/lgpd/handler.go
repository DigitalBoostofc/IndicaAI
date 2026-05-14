// Package lgpd exposes the user-facing LGPD endpoints: data export,
// erasure, and the consent registry. Each request creates a row in
// lgpd_requests (or consents) and dispatches the matching async job —
// nothing happens synchronously in the request lifecycle.
package lgpd

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/indica-ai/indica-ai/internal/api/middleware"
	"github.com/indica-ai/indica-ai/internal/platform/db"
	lgpdWorker "github.com/indica-ai/indica-ai/internal/workers/lgpd"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Handler struct {
	pool   *pgxpool.Pool
	worker *lgpdWorker.Worker
	logger *slog.Logger
}

func New(pool *pgxpool.Pool, logger *slog.Logger) *Handler {
	return &Handler{
		pool:   pool,
		worker: lgpdWorker.NewWorker(pool),
		logger: logger,
	}
}

type requestResponse struct {
	ID            uuid.UUID  `json:"id"`
	Type          string     `json:"type"`
	Status        string     `json:"status"`
	RequestedAt   time.Time  `json:"requested_at"`
	ProcessedAt   *time.Time `json:"processed_at"`
	DownloadURL   *string    `json:"download_url"`
	FailureReason *string    `json:"failure_reason"`
}

// RequestExport handles POST /api/me/lgpd/export. Records a pending
// export request and dispatches the worker job in the background.
func (h *Handler) RequestExport(w http.ResponseWriter, r *http.Request) {
	h.createRequest(w, r, "export")
}

// RequestErase handles POST /api/me/lgpd/erase.
func (h *Handler) RequestErase(w http.ResponseWriter, r *http.Request) {
	h.createRequest(w, r, "erase")
}

// ListRequests handles GET /api/me/lgpd/requests — user-scoped history.
func (h *Handler) ListRequests(w http.ResponseWriter, r *http.Request) {
	claims, _ := middleware.ClaimsFromContext(r.Context())

	rows, err := h.pool.Query(r.Context(),
		`SELECT id, request_type::text, status::text, requested_at, processed_at, download_url, failure_reason
		   FROM lgpd_requests
		  WHERE user_id = $1
		  ORDER BY requested_at DESC
		  LIMIT 50`, claims.UserID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list requests")
		return
	}
	defer rows.Close()

	out := make([]requestResponse, 0)
	for rows.Next() {
		var rr requestResponse
		if err := rows.Scan(&rr.ID, &rr.Type, &rr.Status, &rr.RequestedAt, &rr.ProcessedAt, &rr.DownloadURL, &rr.FailureReason); err != nil {
			continue
		}
		out = append(out, rr)
	}
	writeJSON(w, http.StatusOK, out)
}

func (h *Handler) createRequest(w http.ResponseWriter, r *http.Request, kind string) {
	claims, ok := middleware.ClaimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "not authenticated")
		return
	}
	tid, _ := db.GetTenantID(r.Context())
	tenantID, _ := uuid.Parse(tid)

	// Idempotency: if there is already a pending or processing request of
	// the same kind for this user, return that one instead of opening a
	// duplicate. Erase is irreversible — easy to fat-finger.
	var existingID uuid.UUID
	var existingStatus string
	err := h.pool.QueryRow(r.Context(),
		`SELECT id, status::text FROM lgpd_requests
		  WHERE user_id = $1 AND request_type = $2::lgpd_request_type
		    AND status IN ('pending', 'processing')
		  ORDER BY requested_at DESC LIMIT 1`,
		claims.UserID, kind).Scan(&existingID, &existingStatus)
	if err == nil {
		writeJSON(w, http.StatusAccepted, map[string]any{
			"id":       existingID,
			"type":     kind,
			"status":   existingStatus,
			"message":  "an open " + kind + " request already exists",
		})
		return
	}

	reqID := uuid.New()
	_, err = h.pool.Exec(r.Context(),
		`INSERT INTO lgpd_requests (id, tenant_id, user_id, request_type, status)
		 VALUES ($1, $2, $3, $4::lgpd_request_type, 'pending')`,
		reqID, tenantID, claims.UserID, kind)
	if err != nil {
		h.logger.Error("failed to create lgpd request", "error", err, "kind", kind, "user_id", claims.UserID)
		writeError(w, http.StatusInternalServerError, "failed to record request")
		return
	}

	// Fire-and-forget dispatch. Worker logs its own progress; the user
	// polls GET /api/me/lgpd/requests for status. We detach from the
	// request context so a closed connection doesn't cancel the job.
	go h.dispatch(reqID, claims.UserID, tenantID, kind)

	writeJSON(w, http.StatusAccepted, map[string]any{
		"id":     reqID,
		"type":   kind,
		"status": "pending",
	})
}

func (h *Handler) dispatch(reqID, userID, tenantID uuid.UUID, kind string) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
	defer cancel()

	payload, _ := json.Marshal(map[string]any{
		"request_id": reqID,
		"user_id":    userID,
		"tenant_id":  tenantID,
	})

	var err error
	switch kind {
	case "export":
		err = h.worker.ExportData(ctx, payload)
	case "erase":
		err = h.worker.EraseData(ctx, payload)
	default:
		err = nil
	}
	if err != nil {
		h.logger.Error("lgpd worker failed", "error", err, "request_id", reqID, "kind", kind)
		h.pool.Exec(ctx,
			`UPDATE lgpd_requests SET status = 'failed', failure_reason = $2, updated_at = now()
			 WHERE id = $1`, reqID, err.Error())
	}
}

// ----------------------------- consents -----------------------------

type consentResponse struct {
	ID            uuid.UUID  `json:"id"`
	PolicyName    string     `json:"policy_name"`
	PolicyVersion string     `json:"policy_version"`
	PolicyURL     *string    `json:"policy_url"`
	AcceptedAt    time.Time  `json:"accepted_at"`
	RevokedAt     *time.Time `json:"revoked_at"`
}

// ListConsents handles GET /api/me/consents.
func (h *Handler) ListConsents(w http.ResponseWriter, r *http.Request) {
	claims, _ := middleware.ClaimsFromContext(r.Context())

	rows, err := h.pool.Query(r.Context(),
		`SELECT id, policy_name, policy_version, policy_url, accepted_at, revoked_at
		   FROM consents
		  WHERE user_id = $1
		  ORDER BY accepted_at DESC`,
		claims.UserID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list consents")
		return
	}
	defer rows.Close()

	out := make([]consentResponse, 0)
	for rows.Next() {
		var c consentResponse
		if err := rows.Scan(&c.ID, &c.PolicyName, &c.PolicyVersion, &c.PolicyURL, &c.AcceptedAt, &c.RevokedAt); err != nil {
			continue
		}
		out = append(out, c)
	}
	writeJSON(w, http.StatusOK, out)
}

type grantRequest struct {
	PolicyName    string `json:"policy_name"`
	PolicyVersion string `json:"policy_version"`
	PolicyURL     string `json:"policy_url"`
}

// Grant handles POST /api/me/consents. Records that the user accepted a
// given policy version + URL. Captures IP/UA for the audit trail (LGPD
// art. 8 requires proof of consent).
func (h *Handler) Grant(w http.ResponseWriter, r *http.Request) {
	claims, _ := middleware.ClaimsFromContext(r.Context())
	tid, _ := db.GetTenantID(r.Context())
	tenantID, _ := uuid.Parse(tid)

	var req grantRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.PolicyName == "" || req.PolicyVersion == "" {
		writeError(w, http.StatusBadRequest, "policy_name and policy_version are required")
		return
	}

	ip := extractIP(r)
	ua := r.UserAgent()

	id := uuid.New()
	_, err := h.pool.Exec(r.Context(),
		`INSERT INTO consents (id, tenant_id, user_id, policy_name, policy_version, policy_url, ip_address, user_agent)
		 VALUES ($1, $2, $3, $4, $5, NULLIF($6, ''), NULLIF($7, '')::inet, $8)`,
		id, tenantID, claims.UserID, req.PolicyName, req.PolicyVersion, req.PolicyURL, ip, ua)
	if err != nil {
		h.logger.Error("failed to record consent", "error", err)
		writeError(w, http.StatusInternalServerError, "failed to record consent")
		return
	}

	writeJSON(w, http.StatusCreated, map[string]any{
		"id":             id,
		"policy_name":    req.PolicyName,
		"policy_version": req.PolicyVersion,
	})
}

// Revoke handles DELETE /api/me/consents/{id}. Soft-deletes by stamping
// revoked_at — consents are append-only by design (LGPD audit trail).
func (h *Handler) Revoke(w http.ResponseWriter, r *http.Request) {
	claims, _ := middleware.ClaimsFromContext(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid consent id")
		return
	}

	tag, err := h.pool.Exec(r.Context(),
		`UPDATE consents SET revoked_at = now()
		  WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL`,
		id, claims.UserID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to revoke consent")
		return
	}
	if tag.RowsAffected() == 0 {
		writeError(w, http.StatusNotFound, "consent not found or already revoked")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "revoked"})
}

func extractIP(r *http.Request) string {
	if xf := r.Header.Get("X-Forwarded-For"); xf != "" {
		// Take the first IP in the chain.
		for i := 0; i < len(xf); i++ {
			if xf[i] == ',' {
				return xf[:i]
			}
		}
		return xf
	}
	return r.RemoteAddr
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}
