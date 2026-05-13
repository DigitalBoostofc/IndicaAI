package db_test

import (
	"context"
	"os"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestRLSFortress verifies that PostgreSQL Row Level Security properly isolates tenants.
// This test requires a running Postgres instance with the schema migrated.
// Set DATABASE_URL_TEST env var to run.
func TestRLSFortress(t *testing.T) {
	dbURL := os.Getenv("DATABASE_URL_TEST")
	if dbURL == "" {
		t.Skip("DATABASE_URL_TEST not set, skipping RLS fortress test")
	}

	ctx := context.Background()
	pool, err := pgxpool.New(ctx, dbURL)
	require.NoError(t, err)
	defer pool.Close()

	// Create two tenants
	tenant1 := uuid.New()
	tenant2 := uuid.New()

	// Setup: create tenants and programs
	_, err = pool.Exec(ctx,
		`INSERT INTO tenants (id, name, subdomain, plan, status)
		 VALUES ($1, 'Tenant 1', $2, 'starter', 'active'),
		        ($3, 'Tenant 2', $4, 'starter', 'active')`,
		tenant1, "t1-"+tenant1.String()[:8],
		tenant2, "t2-"+tenant2.String()[:8])
	require.NoError(t, err)

	// Create programs for each tenant
	prog1 := uuid.New()
	prog2 := uuid.New()
	_, err = pool.Exec(ctx,
		`INSERT INTO programs (id, tenant_id, name, rules, redirect_type)
		 VALUES ($1, $2, 'Program 1', '{"schema_version":1,"trigger":"sale.confirmed","reward":{"type":"commission_fixed","amount_brl":100}}', 'website'),
		        ($3, $4, 'Program 2', '{"schema_version":1,"trigger":"sale.confirmed","reward":{"type":"commission_fixed","amount_brl":200}}', 'website')`,
		prog1, tenant1, prog2, tenant2)
	require.NoError(t, err)

	// Test 1: Tenant 1 can see only its own programs
	t.Run("tenant_isolation_programs", func(t *testing.T) {
		// Set tenant 1 context
		_, err := pool.Exec(ctx, "SET LOCAL app.current_tenant = $1", tenant1.String())
		require.NoError(t, err)

		var count int
		err = pool.QueryRow(ctx, "SELECT COUNT(*) FROM programs").Scan(&count)
		require.NoError(t, err)
		assert.Equal(t, 1, count, "Tenant 1 should see exactly 1 program")

		var name string
		err = pool.QueryRow(ctx, "SELECT name FROM programs LIMIT 1").Scan(&name)
		require.NoError(t, err)
		assert.Equal(t, "Program 1", name)

		// Reset
		pool.Exec(ctx, "RESET app.current_tenant")
	})

	// Test 2: Tenant 2 can see only its own programs
	t.Run("tenant2_isolation", func(t *testing.T) {
		_, err := pool.Exec(ctx, "SET LOCAL app.current_tenant = $1", tenant2.String())
		require.NoError(t, err)

		var count int
		err = pool.QueryRow(ctx, "SELECT COUNT(*) FROM programs").Scan(&count)
		require.NoError(t, err)
		assert.Equal(t, 1, count, "Tenant 2 should see exactly 1 program")

		var name string
		err = pool.QueryRow(ctx, "SELECT name FROM programs LIMIT 1").Scan(&name)
		require.NoError(t, err)
		assert.Equal(t, "Program 2", name)

		pool.Exec(ctx, "RESET app.current_tenant")
	})

	// Test 3: Without tenant context, no rows visible
	t.Run("no_tenant_no_access", func(t *testing.T) {
		pool.Exec(ctx, "RESET app.current_tenant")

		var count int
		err := pool.QueryRow(ctx, "SELECT COUNT(*) FROM programs").Scan(&count)
		require.NoError(t, err)
		assert.Equal(t, 0, count, "Without tenant context, no programs should be visible")
	})

	// Cleanup
	pool.Exec(ctx, "DELETE FROM programs WHERE id IN ($1, $2)", prog1, prog2)
	pool.Exec(ctx, "DELETE FROM tenants WHERE id IN ($1, $2)", tenant1, tenant2)
}
