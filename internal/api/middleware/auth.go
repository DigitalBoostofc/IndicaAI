package middleware

import (
	"context"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/indica-ai/indica-ai/internal/platform/auth"
	"github.com/indica-ai/indica-ai/internal/platform/db"
	"github.com/jackc/pgx/v5/pgxpool"
)

// AuthJWT validates JWT from Authorization header or cookie.
func AuthJWT(jwtSvc *auth.JWTService) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			tokenStr := extractToken(r)
			if tokenStr == "" {
				http.Error(w, `{"error":"missing token"}`, http.StatusUnauthorized)
				return
			}

			claims, err := jwtSvc.ValidateToken(tokenStr)
			if err != nil {
				http.Error(w, `{"error":"invalid token"}`, http.StatusUnauthorized)
				return
			}

			if claims.Type != auth.TokenAccess {
				http.Error(w, `{"error":"access token required"}`, http.StatusUnauthorized)
				return
			}

			mwClaims := &Claims{
				UserID:   claims.UserID,
				TenantID: claims.TenantID,
				Role:     claims.Role,
			}

			ctx := WithClaims(r.Context(), mwClaims)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// AuthAPIKey validates API key from X-API-Key header.
// Expected format: iaak_<prefix>_<raw> where prefix is 8 chars.
// Looks up the key by prefix, verifies the full key against Argon2id hash.
func AuthAPIKey(pool *pgxpool.Pool) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			apiKey := r.Header.Get("X-API-Key")
			if apiKey == "" {
				http.Error(w, `{"error":"missing API key"}`, http.StatusUnauthorized)
				return
			}

			// Expected format: iaak_<8-char-prefix>_<raw>
			if !strings.HasPrefix(apiKey, "iaak_") || len(apiKey) < 14 {
				http.Error(w, `{"error":"invalid API key format"}`, http.StatusUnauthorized)
				return
			}

			// Extract prefix: chars 5-12 (after "iaak_")
			prefix := apiKey[5:13]
			rawKey := apiKey // full key for hash verification

			var tenantID uuid.UUID
			var keyHash string
			err := pool.QueryRow(r.Context(),
				`SELECT tenant_id, key_hash FROM api_keys
				 WHERE key_prefix = $1
				   AND revoked_at IS NULL
				   AND (expires_at IS NULL OR expires_at > now())`,
				prefix,
			).Scan(&tenantID, &keyHash)
			if err != nil {
				http.Error(w, `{"error":"invalid API key"}`, http.StatusUnauthorized)
				return
			}

			// Verify full key against stored Argon2id hash
			valid, err := auth.VerifyPassword(rawKey, keyHash)
			if err != nil || !valid {
				http.Error(w, `{"error":"invalid API key"}`, http.StatusUnauthorized)
				return
			}

			// Best-effort update last_used_at (ignore errors)
			go func() {
				ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
				defer cancel()
				_, _ = pool.Exec(ctx, `UPDATE api_keys SET last_used_at = now() WHERE key_prefix = $1`, prefix)
			}()

			// Inject tenant_id into context for downstream middleware/handlers
			ctx := db.WithTenantID(r.Context(), tenantID)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// RequireRole checks that the authenticated user has one of the required roles.
func RequireRole(roles ...string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims, ok := ClaimsFromContext(r.Context())
			if !ok {
				http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
				return
			}

			for _, role := range roles {
				if claims.Role == role {
					next.ServeHTTP(w, r)
					return
				}
			}

			http.Error(w, `{"error":"forbidden"}`, http.StatusForbidden)
		})
	}
}

// extractToken gets JWT from Authorization header (Bearer) or cookie.
func extractToken(r *http.Request) string {
	// Try Authorization header first
	if auth := r.Header.Get("Authorization"); auth != "" {
		if strings.HasPrefix(auth, "Bearer ") {
			return strings.TrimPrefix(auth, "Bearer ")
		}
	}

	// Try cookie
	if cookie, err := r.Cookie("access_token"); err == nil {
		return cookie.Value
	}

	return ""
}
