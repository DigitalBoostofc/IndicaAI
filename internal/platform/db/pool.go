package db

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// contextKey is a private type for context keys in this package.
type contextKey string

const TenantContextKey contextKey = "tenant_id"

// Pool wraps pgxpool.Pool with tenant-scoped transaction support.
type Pool struct {
	*pgxpool.Pool
}

// NewPool creates a new Pool from a database URL.
func NewPool(ctx context.Context, databaseURL string) (*Pool, error) {
	config, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, fmt.Errorf("parse database url: %w", err)
	}

	pool, err := pgxpool.NewWithConfig(ctx, config)
	if err != nil {
		return nil, fmt.Errorf("create pool: %w", err)
	}

	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("ping database: %w", err)
	}

	return &Pool{Pool: pool}, nil
}

// BeginTenant starts a transaction with the tenant_id set via SET LOCAL.
// This is the ONLY way to start a transaction in this project.
// The tenant_id must be present in the context (set by TenantInjector middleware).
func (p *Pool) BeginTenant(ctx context.Context) (pgx.Tx, error) {
	tid, ok := ctx.Value(TenantContextKey).(string)
	if !ok || tid == "" {
		return nil, ErrMissingTenant
	}

	tx, err := p.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin tx: %w", err)
	}

	if _, err := uuid.Parse(tid); err != nil {
		_ = tx.Rollback(ctx)
		return nil, fmt.Errorf("invalid tenant id: %w", err)
	}
	_, err = tx.Exec(ctx, "SET LOCAL app.current_tenant = '"+tid+"'")
	if err != nil {
		_ = tx.Rollback(ctx)
		return nil, fmt.Errorf("set tenant: %w", err)
	}

	return tx, nil
}

// ErrMissingTenant is returned when BeginTenant is called without a tenant in context.
var ErrMissingTenant = fmt.Errorf("missing tenant_id in context")
