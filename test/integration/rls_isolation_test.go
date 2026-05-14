package integration_test

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"os"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestRLSIsolation verifies that PostgreSQL RLS properly isolates tenants
// across ALL domain tables (programs, partners, leads, referrals, rewards,
// payouts, fraud_evaluations).
//
// This is the most critical security test: if RLS fails, tenant A can read
// tenant B's financial data (payouts, pix_keys, rewards).
//
// Requires DATABASE_URL_TEST env var with a migrated Postgres instance.
func TestRLSIsolation(t *testing.T) {
	dbURL := os.Getenv("DATABASE_URL_TEST")
	if dbURL == "" {
		t.Skip("DATABASE_URL_TEST not set, skipping RLS isolation test")
	}

	ctx := context.Background()
	pool, err := pgxpool.New(ctx, dbURL)
	require.NoError(t, err)
	defer pool.Close()

	// Setup: two isolated tenants with identical data structures
	tenantA := uuid.New()
	tenantB := uuid.New()

	t.Cleanup(func() {
		cleanupTenant(ctx, pool, tenantA)
		cleanupTenant(ctx, pool, tenantB)
	})

	// Create tenants
	for _, tid := range []uuid.UUID{tenantA, tenantB} {
		_, err := pool.Exec(ctx,
			`INSERT INTO tenants (id, name, subdomain, plan, status)
			 VALUES ($1, $2, $3, 'starter', 'active')`,
			tid, "RLS Test "+tid.String()[:8], "rls-"+tid.String()[:8])
		require.NoError(t, err)
	}

	// Create programs
	progA := uuid.New()
	progB := uuid.New()
	for _, p := range []struct {
		id     uuid.UUID
		tenant uuid.UUID
		name   string
	}{
		{progA, tenantA, "Program A"},
		{progB, tenantB, "Program B"},
	} {
		_, err := pool.Exec(ctx,
			`INSERT INTO programs (id, tenant_id, name, rules, redirect_type)
			 VALUES ($1, $2, $3, '{"schema_version":1,"trigger":"sale.confirmed","reward":{"type":"commission_fixed","amount_brl":100}}', 'website')`,
			p.id, p.tenant, p.name)
		require.NoError(t, err)
	}

	// Create partners
	partnerA := uuid.New()
	partnerB := uuid.New()
	for _, p := range []struct {
		id      uuid.UUID
		tenant  uuid.UUID
		prog    uuid.UUID
		name    string
		phone   string
		pixKey  string
	}{
		{partnerA, tenantA, progA, "Partner A", "+5511999990001", "partnerA@pix.com"},
		{partnerB, tenantB, progB, "Partner B", "+5511999990002", "partnerB@pix.com"},
	} {
		_, err := pool.Exec(ctx,
			`INSERT INTO partners (id, tenant_id, program_id, name, email, phone_e164, phone_hash, pix_key, status)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active')`,
			p.id, p.tenant, p.prog, p.name,
			fmt.Sprintf("%s@test.com", p.name),
			p.phone, hashStr(p.phone),
			p.pixKey)
		require.NoError(t, err)
	}

	// Create leads
	leadA := uuid.New()
	leadB := uuid.New()
	for _, l := range []struct {
		id      uuid.UUID
		tenant  uuid.UUID
		prog    uuid.UUID
		partner uuid.UUID
		phone   string
	}{
		{leadA, tenantA, progA, partnerA, "+5511888880001"},
		{leadB, tenantB, progB, partnerB, "+5511888880002"},
	} {
		_, err := pool.Exec(ctx,
			`INSERT INTO leads (id, tenant_id, program_id, partner_id, name, phone_e164, phone_hash, status, source)
			 VALUES ($1, $2, $3, $4, 'Lead', $5, $6, 'new', 'referral')`,
			l.id, l.tenant, l.prog, l.partner, l.phone, hashStr(l.phone))
		require.NoError(t, err)
	}

	// Create referrals
	refA := uuid.New()
	refB := uuid.New()
	for _, r := range []struct {
		id      uuid.UUID
		tenant  uuid.UUID
		prog    uuid.UUID
		partner uuid.UUID
		lead    uuid.UUID
	}{
		{refA, tenantA, progA, partnerA, leadA},
		{refB, tenantB, progB, partnerB, leadB},
	} {
		_, err := pool.Exec(ctx,
			`INSERT INTO referrals (id, tenant_id, program_id, partner_id, lead_id, rule_snapshot)
			 VALUES ($1, $2, $3, $4, $5, '{}')`,
			r.id, r.tenant, r.prog, r.partner, r.lead)
		require.NoError(t, err)
	}

	// Create rewards
	rewardA := uuid.New()
	rewardB := uuid.New()
	for _, rw := range []struct {
		id      uuid.UUID
		tenant  uuid.UUID
		prog    uuid.UUID
		ref     uuid.UUID
		partner uuid.UUID
	}{
		{rewardA, tenantA, progA, refA, partnerA},
		{rewardB, tenantB, progB, refB, partnerB},
	} {
		_, err := pool.Exec(ctx,
			`INSERT INTO rewards (id, tenant_id, program_id, referral_id, partner_id, type, amount_cents, status)
			 VALUES ($1, $2, $3, $4, $5, 'commission_fixed', 10000, 'approved')`,
			rw.id, rw.tenant, rw.prog, rw.ref, rw.partner)
		require.NoError(t, err)
	}

	// Create payouts
	payoutA := uuid.New()
	payoutB := uuid.New()
	for _, po := range []struct {
		id      uuid.UUID
		tenant  uuid.UUID
		partner uuid.UUID
		pixKey  string
	}{
		{payoutA, tenantA, partnerA, "partnerA@pix.com"},
		{payoutB, tenantB, partnerB, "partnerB@pix.com"},
	} {
		_, err := pool.Exec(ctx,
			`INSERT INTO payouts (id, tenant_id, partner_id, amount_cents, method, pix_key, pix_key_type, status, reward_ids)
			 VALUES ($1, $2, $3, 10000, 'pix', $4, 'email', 'pending', $5)`,
			po.id, po.tenant, po.partner, po.pixKey, []uuid.UUID{uuid.New()})
		require.NoError(t, err)
	}

	// Create fraud_evaluations
	fraudA := uuid.New()
	fraudB := uuid.New()
	for _, fe := range []struct {
		id      uuid.UUID
		tenant  uuid.UUID
		partner uuid.UUID
	}{
		{fraudA, tenantA, partnerA},
		{fraudB, tenantB, partnerB},
	} {
		_, err := pool.Exec(ctx,
			`INSERT INTO fraud_evaluations (id, tenant_id, partner_id, score, action, signals)
			 VALUES ($1, $2, $3, 0, 'ok', '[]')`,
			fe.id, fe.tenant, fe.partner)
		require.NoError(t, err)
	}

	// ============================================================
	// TESTS: each subtest verifies tenant isolation per table
	// ============================================================

	tables := []string{
		"programs", "partners", "leads", "referrals",
		"rewards", "payouts", "fraud_evaluations",
	}

	for _, tbl := range tables {
		tbl := tbl // capture range var
		t.Run(tbl+"_tenant_a_sees_own", func(t *testing.T) {
			tx, err := pool.Begin(ctx)
			require.NoError(t, err)
			defer tx.Rollback(ctx)

			// pgx silently no-ops SET LOCAL bind params; interpolate the UUID instead.
			_, err = tx.Exec(ctx, "SET LOCAL app.current_tenant = '"+tenantA.String()+"'")
			require.NoError(t, err)

			var count int
			err = tx.QueryRow(ctx, fmt.Sprintf("SELECT COUNT(*) FROM %s", tbl)).Scan(&count)
			require.NoError(t, err)
			assert.Equal(t, 1, count, "Tenant A should see exactly 1 row in %s", tbl)
		})

		t.Run(tbl+"_tenant_b_sees_own", func(t *testing.T) {
			tx, err := pool.Begin(ctx)
			require.NoError(t, err)
			defer tx.Rollback(ctx)

			_, err = tx.Exec(ctx, "SET LOCAL app.current_tenant = '"+tenantB.String()+"'")
			require.NoError(t, err)

			var count int
			err = tx.QueryRow(ctx, fmt.Sprintf("SELECT COUNT(*) FROM %s", tbl)).Scan(&count)
			require.NoError(t, err)
			assert.Equal(t, 1, count, "Tenant B should see exactly 1 row in %s", tbl)
		})

		t.Run(tbl+"_no_tenant_sees_nothing", func(t *testing.T) {
			tx, err := pool.Begin(ctx)
			require.NoError(t, err)
			defer tx.Rollback(ctx)

			// Do NOT set app.current_tenant — RLS should filter everything
			var count int
			err = tx.QueryRow(ctx, fmt.Sprintf("SELECT COUNT(*) FROM %s", tbl)).Scan(&count)
			require.NoError(t, err)
			assert.Equal(t, 0, count, "Without tenant context, %s should return 0 rows", tbl)
		})
	}

	// ============================================================
	// CRITICAL: Cross-tenant financial data leak tests
	// ============================================================

	t.Run("payout_pix_key_not_leaked_to_other_tenant", func(t *testing.T) {
		// Tenant A should NEVER see Tenant B's pix_key
		tx, err := pool.Begin(ctx)
		require.NoError(t, err)
		defer tx.Rollback(ctx)

		_, err = tx.Exec(ctx, "SET LOCAL app.current_tenant = '"+tenantA.String()+"'")
		require.NoError(t, err)

		rows, err := tx.Query(ctx, "SELECT pix_key FROM payouts")
		require.NoError(t, err)
		defer rows.Close()

		var pixKeys []string
		for rows.Next() {
			var pk string
			require.NoError(t, rows.Scan(&pk))
			pixKeys = append(pixKeys, pk)
		}

		require.Len(t, pixKeys, 1, "Tenant A should see exactly 1 payout")
		assert.Equal(t, "partnerA@pix.com", pixKeys[0])
		assert.NotContains(t, pixKeys, "partnerB@pix.com",
			"Tenant A must NEVER see Tenant B's pix_key")
	})

	t.Run("partner_pix_key_not_leaked_to_other_tenant", func(t *testing.T) {
		tx, err := pool.Begin(ctx)
		require.NoError(t, err)
		defer tx.Rollback(ctx)

		_, err = tx.Exec(ctx, "SET LOCAL app.current_tenant = '"+tenantB.String()+"'")
		require.NoError(t, err)

		rows, err := tx.Query(ctx, "SELECT pix_key FROM partners")
		require.NoError(t, err)
		defer rows.Close()

		var pixKeys []string
		for rows.Next() {
			var pk string
			require.NoError(t, rows.Scan(&pk))
			pixKeys = append(pixKeys, pk)
		}

		require.Len(t, pixKeys, 1)
		assert.Equal(t, "partnerB@pix.com", pixKeys[0])
		assert.NotContains(t, pixKeys, "partnerA@pix.com")
	})
}

// hashStr produces a sha256 hex digest, matching auth.HashToken behavior.
func hashStr(s string) string {
	h := sha256.Sum256([]byte(s))
	return hex.EncodeToString(h[:])
}

// cleanupTenant deletes all test data for a tenant in FK-safe order.
func cleanupTenant(ctx context.Context, pool *pgxpool.Pool, tenantID uuid.UUID) {
	tables := []string{
		"fraud_evaluations", "payouts", "rewards", "sales",
		"referrals", "leads", "click_events", "attributions",
		"partner_links", "partners", "programs",
		"tenant_members", "idempotency_keys",
	}
	for _, tbl := range tables {
		pool.Exec(ctx, fmt.Sprintf("DELETE FROM %s WHERE tenant_id = $1", tbl), tenantID)
	}
	pool.Exec(ctx, "DELETE FROM tenants WHERE id = $1", tenantID)
}
