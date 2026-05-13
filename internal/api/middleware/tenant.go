package middleware

import (
	"context"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/indica-ai/indica-ai/internal/platform/db"
)

// TenantInjector extracts tenant_id from JWT claims and injects it into context.
func TenantInjector(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims, ok := ClaimsFromContext(r.Context())
		if !ok || claims.TenantID == uuid.Nil {
			http.Error(w, `{"error":"tenant required"}`, http.StatusUnauthorized)
			return
		}

		ctx := db.WithTenantID(r.Context(), claims.TenantID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// TenantFromURL extracts tenant_id from URL param (for admin routes).
func TenantFromURL(param string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			tidStr := chi.URLParam(r, param)
			tid, err := uuid.Parse(tidStr)
			if err != nil {
				http.Error(w, `{"error":"invalid tenant_id"}`, http.StatusBadRequest)
				return
			}
			ctx := db.WithTenantID(r.Context(), tid)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// contextKey is private for middleware package.
type contextKey string

const claimsContextKey contextKey = "jwt_claims"

// WithClaims adds JWT claims to context.
func WithClaims(ctx context.Context, claims *Claims) context.Context {
	return context.WithValue(ctx, claimsContextKey, claims)
}

// ClaimsFromContext extracts JWT claims from context.
func ClaimsFromContext(ctx context.Context) (*Claims, bool) {
	claims, ok := ctx.Value(claimsContextKey).(*Claims)
	return claims, ok
}

// Claims mirrors auth.Claims but is local to middleware for import cycle avoidance.
type Claims struct {
	UserID   uuid.UUID
	TenantID uuid.UUID
	Role     string
}
