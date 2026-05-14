// Package sessions exposes the user-facing session/refresh-token registry
// so the user can see every device that holds a refresh token and revoke
// each one individually (or all at once).
package sessions

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/indica-ai/indica-ai/internal/api/middleware"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Handler struct {
	pool *pgxpool.Pool
}

func New(pool *pgxpool.Pool) *Handler {
	return &Handler{pool: pool}
}

type sessionEntry struct {
	ID        uuid.UUID `json:"id"`
	IPAddress *string   `json:"ip_address"`
	UserAgent *string   `json:"user_agent"`
	CreatedAt time.Time `json:"created_at"`
	ExpiresAt time.Time `json:"expires_at"`
}

// List handles GET /api/me/sessions — returns every active session row
// for the authenticated user. "Active" = not revoked AND not expired.
// The UI shows the regular /api/auth/logout button for "this device",
// so we don't need to tag which row is the current one.
func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	claims, _ := middleware.ClaimsFromContext(r.Context())

	rows, err := h.pool.Query(r.Context(),
		`SELECT id, host(ip_address), user_agent, created_at, expires_at
		   FROM sessions
		  WHERE user_id = $1
		    AND revoked_at IS NULL
		    AND expires_at > now()
		  ORDER BY created_at DESC
		  LIMIT 50`,
		claims.UserID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list sessions")
		return
	}
	defer rows.Close()

	out := make([]sessionEntry, 0)
	for rows.Next() {
		var s sessionEntry
		if err := rows.Scan(&s.ID, &s.IPAddress, &s.UserAgent, &s.CreatedAt, &s.ExpiresAt); err != nil {
			continue
		}
		out = append(out, s)
	}
	writeJSON(w, http.StatusOK, out)
}

// Revoke handles POST /api/me/sessions/{id}/revoke — kills one session +
// every refresh token bound to it. Useful for "I logged in on a public
// computer" scenarios.
func (h *Handler) Revoke(w http.ResponseWriter, r *http.Request) {
	claims, _ := middleware.ClaimsFromContext(r.Context())

	sessionID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid session id")
		return
	}

	tx, err := h.pool.Begin(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to begin tx")
		return
	}
	defer tx.Rollback(r.Context())

	// Scope the UPDATE to the caller's own user_id so a user can't revoke
	// somebody else's session by guessing the UUID.
	tag, err := tx.Exec(r.Context(),
		`UPDATE sessions SET revoked_at = now()
		  WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL`,
		sessionID, claims.UserID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to revoke session")
		return
	}
	if tag.RowsAffected() == 0 {
		writeError(w, http.StatusNotFound, "session not found or already revoked")
		return
	}

	if _, err := tx.Exec(r.Context(),
		`UPDATE refresh_tokens SET revoked_at = now()
		  WHERE session_id = $1 AND user_id = $2 AND revoked_at IS NULL`,
		sessionID, claims.UserID); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to revoke refresh tokens")
		return
	}

	if err := tx.Commit(r.Context()); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to commit")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "revoked"})
}

// RevokeAll handles POST /api/me/sessions/revoke-all — global logout
// across every device. The caller's JWT is short-lived and stays valid
// until expiry (a few minutes), so they'll be kicked out next time their
// frontend tries to refresh.
func (h *Handler) RevokeAll(w http.ResponseWriter, r *http.Request) {
	claims, _ := middleware.ClaimsFromContext(r.Context())

	tx, err := h.pool.Begin(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to begin tx")
		return
	}
	defer tx.Rollback(r.Context())

	tag, err := tx.Exec(r.Context(),
		`UPDATE sessions SET revoked_at = now()
		  WHERE user_id = $1 AND revoked_at IS NULL`,
		claims.UserID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to revoke sessions")
		return
	}

	if _, err := tx.Exec(r.Context(),
		`UPDATE refresh_tokens SET revoked_at = now()
		  WHERE user_id = $1 AND revoked_at IS NULL`,
		claims.UserID); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to revoke refresh tokens")
		return
	}

	if err := tx.Commit(r.Context()); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to commit")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"status":        "revoked",
		"revoked_count": tag.RowsAffected(),
	})
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}
