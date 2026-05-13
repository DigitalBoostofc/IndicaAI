package db

import (
	"context"

	"github.com/google/uuid"
)

// WithTenantID adds a tenant ID to the context.
func WithTenantID(ctx context.Context, tenantID uuid.UUID) context.Context {
	return context.WithValue(ctx, TenantContextKey, tenantID.String())
}

// GetTenantID extracts the tenant ID string from context.
func GetTenantID(ctx context.Context) (string, bool) {
	tid, ok := ctx.Value(TenantContextKey).(string)
	return tid, ok
}

// MustGetTenantID extracts the tenant ID or panics.
func MustGetTenantID(ctx context.Context) string {
	tid, ok := GetTenantID(ctx)
	if !ok {
		panic("missing tenant_id in context")
	}
	return tid
}
