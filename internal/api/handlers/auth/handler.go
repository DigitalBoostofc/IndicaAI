package auth

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/indica-ai/indica-ai/internal/api/dto"
	"github.com/indica-ai/indica-ai/internal/api/middleware"
	"github.com/indica-ai/indica-ai/internal/platform/auth"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Handler handles authentication endpoints.
type Handler struct {
	pool   *pgxpool.Pool
	jwtSvc *auth.JWTService
	appEnv string
}

// New creates a new auth handler.
func New(pool *pgxpool.Pool, jwtSvc *auth.JWTService, appEnv string) *Handler {
	return &Handler{pool: pool, jwtSvc: jwtSvc, appEnv: appEnv}
}

// Register handles POST /auth/register.
func (h *Handler) Register(w http.ResponseWriter, r *http.Request) {
	var req dto.RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	// Hash password
	hash, err := auth.HashPassword(req.Password)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to hash password")
		return
	}

	// Generate IDs
	userID := uuid.New()
	emailHash := auth.HashToken(req.Email) // reuse hash function

	// Register is the front door of the SaaS — a new signup owns their own
	// workspace. Wrap user + tenant + membership in a single tx so any failure
	// rolls back cleanly and the user can retry without orphaned rows.
	tx, err := h.pool.Begin(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to begin tx")
		return
	}
	defer tx.Rollback(r.Context())

	_, err = tx.Exec(r.Context(),
		`INSERT INTO users (id, email, email_hash, name, password_hash, role)
		 VALUES ($1, $2, $3, $4, $5, 'user')`,
		userID, req.Email, emailHash, req.Name, hash)
	if err != nil {
		writeError(w, http.StatusConflict, "email already registered")
		return
	}

	// Auto-provision a tenant owned by this user. Subdomain is the user UUID's
	// short prefix — guaranteed unique without leaking PII; the user can rename
	// later from the dashboard.
	tenantID := uuid.New()
	subdomain := "t" + userID.String()[:8]
	tenantName := req.Name
	if tenantName == "" {
		tenantName = "Minha empresa"
	}
	_, err = tx.Exec(r.Context(),
		`INSERT INTO tenants (id, name, subdomain) VALUES ($1, $2, $3)`,
		tenantID, tenantName, subdomain)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create tenant")
		return
	}

	_, err = tx.Exec(r.Context(),
		`INSERT INTO tenant_members (tenant_id, user_id, role, joined_at)
		 VALUES ($1, $2, 'owner', now())`,
		tenantID, userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create tenant membership")
		return
	}

	// Session + refresh token rows live in the same tx so the user has a clean
	// audit trail from the very first second.
	sessionID := uuid.New()
	expiresAt := time.Now().Add(24 * time.Hour)
	_, err = tx.Exec(r.Context(),
		`INSERT INTO sessions (id, user_id, tenant_id, ip_address, user_agent, expires_at)
		 VALUES ($1, $2, $3, $4, $5, $6)`,
		sessionID, userID, tenantID, r.RemoteAddr, r.UserAgent(), expiresAt)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create session")
		return
	}

	accessToken, err := h.jwtSvc.GenerateAccessToken(userID, tenantID, "user")
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to generate token")
		return
	}

	familyID := uuid.New()
	refreshToken, jti, err := h.jwtSvc.GenerateRefreshToken(userID, tenantID, familyID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to generate refresh token")
		return
	}

	tokenHash := auth.HashToken(refreshToken)
	_, err = tx.Exec(r.Context(),
		`INSERT INTO refresh_tokens (id, user_id, session_id, tenant_id, family_id, token_hash, jti, expires_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
		uuid.New(), userID, sessionID, tenantID, familyID, tokenHash, jti, time.Now().Add(30*24*time.Hour))
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to store refresh token")
		return
	}

	if err := tx.Commit(r.Context()); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to commit registration")
		return
	}

	// Set cookies
	setTokenCookies(w, accessToken, refreshToken)

	writeJSON(w, http.StatusCreated, dto.TokenResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    int(time.Now().Add(15 * time.Minute).Sub(time.Now()).Seconds()),
	})
}

// Login handles POST /auth/login.
func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var req dto.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	emailHash := auth.HashToken(req.Email)

	// Find user
	var userID uuid.UUID
	var passwordHash string
	var role string
	err := h.pool.QueryRow(r.Context(),
		`SELECT id, password_hash, role FROM users WHERE email_hash = $1`,
		emailHash).Scan(&userID, &passwordHash, &role)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "invalid credentials")
		return
	}

	// Verify password
	valid, err := auth.VerifyPassword(req.Password, passwordHash)
	if err != nil || !valid {
		writeError(w, http.StatusUnauthorized, "invalid credentials")
		return
	}

	// Update last login
	h.pool.Exec(r.Context(),
		`UPDATE users SET last_login_at = now() WHERE id = $1`, userID)

	// Find tenant membership (first one)
	var tenantID uuid.UUID
	h.pool.QueryRow(r.Context(),
		`SELECT tenant_id FROM tenant_members WHERE user_id = $1 LIMIT 1`,
		userID).Scan(&tenantID)

	// Create session
	sessionID := uuid.New()
	expiresAt := time.Now().Add(24 * time.Hour)
	h.pool.Exec(r.Context(),
		`INSERT INTO sessions (id, user_id, tenant_id, ip_address, user_agent, expires_at)
		 VALUES ($1, $2, $3, $4, $5, $6)`,
		sessionID, userID, tenantID, r.RemoteAddr, r.UserAgent(), expiresAt)

	// Generate tokens
	accessToken, err := h.jwtSvc.GenerateAccessToken(userID, tenantID, role)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to generate token")
		return
	}

	familyID := uuid.New()
	refreshToken, jti, err := h.jwtSvc.GenerateRefreshToken(userID, tenantID, familyID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to generate refresh token")
		return
	}

	// Store refresh token
	tokenHash := auth.HashToken(refreshToken)
	h.pool.Exec(r.Context(),
		`INSERT INTO refresh_tokens (id, user_id, session_id, tenant_id, family_id, token_hash, jti, expires_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
		uuid.New(), userID, sessionID, tenantID, familyID, tokenHash, jti, time.Now().Add(30*24*time.Hour))

	setTokenCookies(w, accessToken, refreshToken)

	writeJSON(w, http.StatusOK, dto.TokenResponse{
		AccessToken: accessToken,
		ExpiresIn:   int(15 * time.Minute.Seconds()),
	})
}

// RefreshToken handles POST /auth/refresh.
func (h *Handler) RefreshToken(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("refresh_token")
	if err != nil {
		writeError(w, http.StatusUnauthorized, "missing refresh token")
		return
	}

	claims, err := h.jwtSvc.ValidateToken(cookie.Value)
	if err != nil || claims.Type != auth.TokenRefresh {
		writeError(w, http.StatusUnauthorized, "invalid refresh token")
		return
	}

	tokenHash := auth.HashToken(cookie.Value)

	// Find the refresh token
	var storedToken struct {
		ID        uuid.UUID
		UserID    uuid.UUID
		TenantID  uuid.UUID
		FamilyID  uuid.UUID
		RevokedAt *time.Time
	}
	err = h.pool.QueryRow(r.Context(),
		`SELECT id, user_id, tenant_id, family_id, revoked_at FROM refresh_tokens WHERE token_hash = $1`,
		tokenHash).Scan(&storedToken.ID, &storedToken.UserID, &storedToken.TenantID,
		&storedToken.FamilyID, &storedToken.RevokedAt)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "refresh token not found")
		return
	}

	// Token theft detection: if token is revoked, revoke entire family
	if storedToken.RevokedAt != nil {
		h.pool.Exec(r.Context(),
			`UPDATE refresh_tokens SET revoked_at = now() WHERE family_id = $1`,
			storedToken.FamilyID)
		writeError(w, http.StatusUnauthorized, "token theft detected — all sessions revoked")
		return
	}

	// Revoke old token
	h.pool.Exec(r.Context(),
		`UPDATE refresh_tokens SET revoked_at = now() WHERE id = $1`, storedToken.ID)

	// Get user role
	var role string
	h.pool.QueryRow(r.Context(),
		`SELECT role FROM users WHERE id = $1`, storedToken.UserID).Scan(&role)

	// Generate new tokens
	accessToken, err := h.jwtSvc.GenerateAccessToken(storedToken.UserID, storedToken.TenantID, role)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to generate token")
		return
	}

	newRefreshToken, jti, err := h.jwtSvc.GenerateRefreshToken(storedToken.UserID, storedToken.TenantID, storedToken.FamilyID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to generate refresh token")
		return
	}

	// Store new refresh token
	newTokenHash := auth.HashToken(newRefreshToken)
	newRefreshID := uuid.New()
	h.pool.Exec(r.Context(),
		`INSERT INTO refresh_tokens (id, user_id, session_id, tenant_id, family_id, token_hash, jti, expires_at)
		 VALUES ($1, $2, NULL, $3, $4, $5, $6, $7)`,
		newRefreshID, storedToken.UserID, storedToken.TenantID, storedToken.FamilyID, newTokenHash, jti, time.Now().Add(30*24*time.Hour))

	// Update replaced_by
	h.pool.Exec(r.Context(),
		`UPDATE refresh_tokens SET replaced_by = $1 WHERE id = $2`, newRefreshID, storedToken.ID)

	setTokenCookies(w, accessToken, newRefreshToken)

	writeJSON(w, http.StatusOK, dto.TokenResponse{
		AccessToken: accessToken,
		ExpiresIn:   int(15 * time.Minute.Seconds()),
	})
}

// RequestMagicLink handles POST /api/auth/magic-link.
// Looks up a partner by email, creates a user record if needed, generates a
// one-time token, stores its hash, and returns the raw token in dev mode so the
// frontend can complete the flow without a real email integration.
func (h *Handler) RequestMagicLink(w http.ResponseWriter, r *http.Request) {
	var req dto.MagicLinkRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Email == "" {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	emailHash := auth.HashToken(req.Email)

	// Find the most recently active partner for this email across any tenant.
	// The partner_links UNIQUE on (tenant_id, program_id, email_hash) prevents
	// duplicates per program, but a single human may exist in multiple programs.
	var partnerID, tenantID uuid.UUID
	var partnerName string
	var partnerUserID *uuid.UUID
	err := h.pool.QueryRow(r.Context(),
		`SELECT id, tenant_id, name, user_id
		   FROM partners
		  WHERE email_hash = $1 AND status = 'active'
		  ORDER BY updated_at DESC
		  LIMIT 1`,
		emailHash).Scan(&partnerID, &tenantID, &partnerName, &partnerUserID)
	if errors.Is(err, pgx.ErrNoRows) {
		// Don't leak existence — return success either way.
		writeJSON(w, http.StatusOK, map[string]string{
			"message": "if an account exists for this email, a link was sent",
		})
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to lookup partner")
		return
	}

	// Resolve the user record. Partners may not have a user_id yet (created via
	// admin invite). Create one on-demand for magic-link login.
	var userID uuid.UUID
	if partnerUserID != nil {
		userID = *partnerUserID
	} else {
		// Try to find existing user by email_hash (could already exist from another tenant)
		err = h.pool.QueryRow(r.Context(),
			`SELECT id FROM users WHERE email_hash = $1 LIMIT 1`,
			emailHash).Scan(&userID)
		if errors.Is(err, pgx.ErrNoRows) {
			userID = uuid.New()
			_, err = h.pool.Exec(r.Context(),
				`INSERT INTO users (id, email, email_hash, name, role, email_verified)
				 VALUES ($1, $2, $3, $4, 'user', false)`,
				userID, req.Email, emailHash, partnerName)
			if err != nil {
				writeError(w, http.StatusInternalServerError, "failed to create user")
				return
			}
		} else if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to lookup user")
			return
		}
		// Link partner → user
		h.pool.Exec(r.Context(),
			`UPDATE partners SET user_id = $1, updated_at = now() WHERE id = $2`,
			userID, partnerID)
	}

	// Generate a one-time token (32 bytes = 64 hex chars)
	raw := make([]byte, 32)
	if _, err := rand.Read(raw); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to generate token")
		return
	}
	token := hex.EncodeToString(raw)
	tokenHash := auth.HashToken(token)

	_, err = h.pool.Exec(r.Context(),
		`INSERT INTO magic_link_tokens (token_hash, user_id, partner_id, tenant_id, expires_at)
		 VALUES ($1, $2, $3, $4, $5)`,
		tokenHash, userID, partnerID, tenantID, time.Now().Add(15*time.Minute))
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to store token")
		return
	}

	// TODO: send email via Resend when RESEND_API_KEY is configured.
	// dev_token is only exposed outside production so a developer can complete
	// the flow without a real email integration. In production this MUST be
	// dropped — leaking the token defeats magic-link auth entirely.
	resp := map[string]string{"message": "magic link issued"}
	if h.appEnv != "production" {
		resp["dev_token"] = token
	}
	writeJSON(w, http.StatusOK, resp)
}

// VerifyMagicLink handles POST /api/auth/magic-link/verify.
func (h *Handler) VerifyMagicLink(w http.ResponseWriter, r *http.Request) {
	var req dto.MagicLinkVerifyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Token == "" {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	tokenHash := auth.HashToken(req.Token)

	var userID, tenantID uuid.UUID
	err := h.pool.QueryRow(r.Context(),
		`UPDATE magic_link_tokens
		    SET used_at = now()
		  WHERE token_hash = $1
		    AND used_at IS NULL
		    AND expires_at > now()
		RETURNING user_id, tenant_id`,
		tokenHash).Scan(&userID, &tenantID)
	if errors.Is(err, pgx.ErrNoRows) {
		writeError(w, http.StatusUnauthorized, "invalid or expired token")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to verify token")
		return
	}

	// Mark login + create session
	h.pool.Exec(r.Context(),
		`UPDATE users SET last_login_at = now(), email_verified = true WHERE id = $1`, userID)

	sessionID := uuid.New()
	h.pool.Exec(r.Context(),
		`INSERT INTO sessions (id, user_id, tenant_id, ip_address, user_agent, expires_at)
		 VALUES ($1, $2, $3, $4, $5, $6)`,
		sessionID, userID, tenantID, r.RemoteAddr, r.UserAgent(), time.Now().Add(24*time.Hour))

	accessToken, err := h.jwtSvc.GenerateAccessToken(userID, tenantID, "user")
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to generate token")
		return
	}

	familyID := uuid.New()
	refreshToken, jti, err := h.jwtSvc.GenerateRefreshToken(userID, tenantID, familyID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to generate refresh token")
		return
	}

	refreshHash := auth.HashToken(refreshToken)
	h.pool.Exec(r.Context(),
		`INSERT INTO refresh_tokens (id, user_id, session_id, tenant_id, family_id, token_hash, jti, expires_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
		uuid.New(), userID, sessionID, tenantID, familyID, refreshHash, jti, time.Now().Add(30*24*time.Hour))

	setTokenCookies(w, accessToken, refreshToken)

	writeJSON(w, http.StatusOK, dto.TokenResponse{
		AccessToken: accessToken,
		ExpiresIn:   int(15 * time.Minute.Seconds()),
	})
}

// Me handles GET /api/me — returns the authenticated user's session info.
func (h *Handler) Me(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.ClaimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "not authenticated")
		return
	}

	var email, name string
	var tenantName *string
	h.pool.QueryRow(r.Context(),
		`SELECT u.email, u.name, t.name
		   FROM users u
		   LEFT JOIN tenants t ON t.id = $2
		  WHERE u.id = $1`,
		claims.UserID, claims.TenantID).Scan(&email, &name, &tenantName)

	resp := map[string]interface{}{
		"id":    claims.UserID,
		"email": email,
		"name":  name,
	}
	if claims.TenantID != uuid.Nil {
		resp["tenant_id"] = claims.TenantID
		if tenantName != nil {
			resp["tenant_name"] = *tenantName
		}
	}
	writeJSON(w, http.StatusOK, resp)
}

// Logout handles POST /auth/logout.
func (h *Handler) Logout(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("refresh_token")
	if err == nil {
		tokenHash := auth.HashToken(cookie.Value)
		h.pool.Exec(r.Context(),
			`UPDATE refresh_tokens SET revoked_at = now() WHERE token_hash = $1`, tokenHash)
	}

	// Clear cookies
	http.SetCookie(w, &http.Cookie{
		Name:     "access_token",
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteNoneMode,
	})
	http.SetCookie(w, &http.Cookie{
		Name:     "refresh_token",
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteNoneMode,
	})

	writeJSON(w, http.StatusOK, map[string]string{"status": "logged_out"})
}

func setTokenCookies(w http.ResponseWriter, accessToken, refreshToken string) {
	http.SetCookie(w, &http.Cookie{
		Name:     "access_token",
		Value:    accessToken,
		Path:     "/",
		MaxAge:   int(15 * time.Minute.Seconds()),
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteNoneMode,
	})
	http.SetCookie(w, &http.Cookie{
		Name:     "refresh_token",
		Value:    refreshToken,
		Path:     "/",
		MaxAge:   int(30 * 24 * time.Hour.Seconds()),
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteNoneMode,
	})
}

func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, dto.ErrorResponse{Error: msg})
}
