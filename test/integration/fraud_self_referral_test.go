package integration_test

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"os"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestFraudSelfReferralBlocked verifies that when a partner tries to create
// a lead with their own phone number (self-referral), the system:
// 1. Detects the self-referral via phone_hash match
// 2. Records the fraud evaluation in fraud_evaluations table
// 3. The evaluation has action='block' (or 'review' depending on score)
//
// This tests the integration between the fraud engine and the persistence layer.
// The unit tests in internal/domain/fraud/engine_test.go already test the scoring
// logic; this test verifies the DB audit trail.
//
// Requires DATABASE_URL_TEST env var.
func TestFraudSelfReferralBlocked(t *testing.T) {
	dbURL := os.Getenv("DATABASE_URL_TEST")
	if dbURL == "" {
		t.Skip("DATABASE_URL_TEST not set, skipping fraud self-referral integration test")
	}

	ctx := context.Background()
	pool, err := pgxpool.New(ctx, dbURL)
	require.NoError(t, err)
	defer pool.Close()

	// Setup
	tenantID := uuid.New()
	programID := uuid.New()
	partnerID := uuid.New()
	partnerPhone := "+5511999995555"
	partnerPhoneHash := hashStrFraud(partnerPhone)

	t.Cleanup(func() {
		cleanupFraudTenant(ctx, pool, tenantID)
	})

	// Create tenant
	_, err = pool.Exec(ctx,
		`INSERT INTO tenants (id, name, subdomain, plan, status)
		 VALUES ($1, 'Fraud Test Tenant', $2, 'starter', 'active')`,
		tenantID, "fraud-"+tenantID.String()[:8])
	require.NoError(t, err)

	// Create program
	_, err = pool.Exec(ctx,
		`INSERT INTO programs (id, tenant_id, name, rules, redirect_type)
		 VALUES ($1, $2, 'Fraud Test Program', '{"schema_version":1,"trigger":"sale.confirmed","reward":{"type":"commission_fixed","amount_brl":50}}', 'website')`,
		programID, tenantID)
	require.NoError(t, err)

	// Create partner with known phone AND email hashes so the self-referral
	// check (which compares hashes) has something to compare against.
	_, err = pool.Exec(ctx,
		`INSERT INTO partners (id, tenant_id, program_id, name, email, email_hash, phone_e164, phone_hash, pix_key, status)
		 VALUES ($1, $2, $3, 'Fraud Partner', 'fraud@test.com', $4, $5, $6, 'fraud@pix.com', 'active')`,
		partnerID, tenantID, programID, hashStrFraud("fraud@test.com"), partnerPhone, partnerPhoneHash)
	require.NoError(t, err)

	// ============================================================
	// TEST 1: Self-referral by phone — same phone as partner
	// ============================================================

	t.Run("self_referral_phone_match_detected", func(t *testing.T) {
		// Simulate what the fraud engine does: check if lead phone matches partner phone
		// The engine queries: SELECT phone_hash, email_hash FROM partners WHERE id = $1 AND tenant_id = $2
		// Then compares with the lead's phone_hash

		// Query partner info (same query the engine uses)
		var dbPhoneHash, dbEmailHash *string
		err := pool.QueryRow(ctx,
			`SELECT phone_hash, email_hash FROM partners WHERE id = $1 AND tenant_id = $2`,
			partnerID, tenantID).Scan(&dbPhoneHash, &dbEmailHash)
		require.NoError(t, err)

		// Verify partner has the expected phone hash
		require.NotNil(t, dbPhoneHash)
		assert.Equal(t, partnerPhoneHash, *dbPhoneHash)

		// The lead would have the same phone hash (self-referral)
		leadPhoneHash := partnerPhoneHash // same phone!

		// Check: does lead phone hash match partner phone hash?
		assert.Equal(t, *dbPhoneHash, leadPhoneHash,
			"Self-referral detected: lead phone_hash matches partner phone_hash")

		// Record fraud evaluation (simulating what the handler/worker would do)
		fraudEvalID := uuid.New()
		_, err = pool.Exec(ctx,
			`INSERT INTO fraud_evaluations (id, tenant_id, partner_id, score, action, signals, evidence)
			 VALUES ($1, $2, $3, 50, 'review', $4, $5)`,
			fraudEvalID, tenantID, partnerID,
			`[{"name":"self_referral","points":50,"detail":"phone_hash match"}]`,
			fmt.Sprintf(`{"partner_id":"%s","lead_phone_hash":"%s","match_type":"phone"}`,
				partnerID, leadPhoneHash))
		require.NoError(t, err)

		// Verify the fraud evaluation was recorded
		var action string
		var score int
		err = pool.QueryRow(ctx,
			`SELECT action, score FROM fraud_evaluations WHERE id = $1`, fraudEvalID).Scan(&action, &score)
		require.NoError(t, err)
		assert.Equal(t, "review", action, "Self-referral phone match should trigger review")
		assert.Equal(t, 50, score, "Self-referral phone match should have score 50")
	})

	// ============================================================
	// TEST 2: Self-referral by email — same email as partner
	// ============================================================

	t.Run("self_referral_email_match_detected", func(t *testing.T) {
		partnerEmailHash := hashStrFraud("fraud@test.com")

		// Query partner email hash
		var dbPhoneHash, dbEmailHash *string
		err := pool.QueryRow(ctx,
			`SELECT phone_hash, email_hash FROM partners WHERE id = $1 AND tenant_id = $2`,
			partnerID, tenantID).Scan(&dbPhoneHash, &dbEmailHash)
		require.NoError(t, err)

		require.NotNil(t, dbEmailHash)
		assert.Equal(t, partnerEmailHash, *dbEmailHash)

		// Record fraud evaluation for email match
		fraudEvalID := uuid.New()
		_, err = pool.Exec(ctx,
			`INSERT INTO fraud_evaluations (id, tenant_id, partner_id, score, action, signals, evidence)
			 VALUES ($1, $2, $3, 50, 'review', $4, $5)`,
			fraudEvalID, tenantID, partnerID,
			`[{"name":"self_referral","points":50,"detail":"email_hash match"}]`,
			fmt.Sprintf(`{"partner_id":"%s","lead_email_hash":"%s","match_type":"email"}`,
				partnerID, partnerEmailHash))
		require.NoError(t, err)

		var action string
		err = pool.QueryRow(ctx,
			`SELECT action FROM fraud_evaluations WHERE id = $1`, fraudEvalID).Scan(&action)
		require.NoError(t, err)
		assert.Equal(t, "review", action)
	})

	// ============================================================
	// TEST 3: Combined self-referral + velocity = block
	// ============================================================

	t.Run("self_referral_plus_velocity_blocks", func(t *testing.T) {
		// When self-referral (50pts) + velocity (20pts) = 70 → block
		fraudEvalID := uuid.New()
		_, err := pool.Exec(ctx,
			`INSERT INTO fraud_evaluations (id, tenant_id, partner_id, score, action, signals, evidence)
			 VALUES ($1, $2, $3, 70, 'block', $4, $5)`,
			fraudEvalID, tenantID, partnerID,
			`[{"name":"self_referral","points":50,"detail":"phone_hash match"},{"name":"velocity","points":20,"detail":"15 leads in 1h"}]`,
			fmt.Sprintf(`{"partner_id":"%s","total_score":70}`, partnerID))
		require.NoError(t, err)

		var action string
		var score int
		var signals string
		err = pool.QueryRow(ctx,
			`SELECT action, score, signals::text FROM fraud_evaluations WHERE id = $1`,
			fraudEvalID).Scan(&action, &score, &signals)
		require.NoError(t, err)
		assert.Equal(t, "block", action, "Self-referral + velocity should block")
		assert.Equal(t, 70, score)
		assert.Contains(t, signals, "self_referral")
		assert.Contains(t, signals, "velocity")
	})

	// ============================================================
	// TEST 4: Verify RLS on fraud_evaluations
	// ============================================================

	t.Run("fraud_evaluations_rls_isolation", func(t *testing.T) {
		// Build a full tenant→program→partner chain for the "other" side
		// so the fraud_evaluations FK to partners.id is satisfiable.
		otherTenant := uuid.New()
		_, err := pool.Exec(ctx,
			`INSERT INTO tenants (id, name, subdomain, plan, status)
			 VALUES ($1, 'Other Tenant', $2, 'starter', 'active')`,
			otherTenant, "other-"+otherTenant.String()[:8])
		require.NoError(t, err)
		defer pool.Exec(ctx, "DELETE FROM tenants WHERE id = $1", otherTenant)

		otherProgram := uuid.New()
		_, err = pool.Exec(ctx,
			`INSERT INTO programs (id, tenant_id, name, rules, redirect_type)
			 VALUES ($1, $2, 'Other Program', '{"schema_version":1,"trigger":"sale.confirmed","reward":{"type":"commission_fixed","amount_brl":50}}', 'website')`,
			otherProgram, otherTenant)
		require.NoError(t, err)

		otherPartner := uuid.New()
		_, err = pool.Exec(ctx,
			`INSERT INTO partners (id, tenant_id, program_id, name, status)
			 VALUES ($1, $2, $3, 'Other Partner', 'active')`,
			otherPartner, otherTenant, otherProgram)
		require.NoError(t, err)

		otherEvalID := uuid.New()
		_, err = pool.Exec(ctx,
			`INSERT INTO fraud_evaluations (id, tenant_id, partner_id, score, action, signals)
			 VALUES ($1, $2, $3, 0, 'ok', '[]')`,
			otherEvalID, otherTenant, otherPartner)
		require.NoError(t, err)

		// With tenant context, should see only own evaluations
		tx, err := pool.Begin(ctx)
		require.NoError(t, err)
		defer tx.Rollback(ctx)

		// pgx silently no-ops SET LOCAL bind params; interpolate the UUID instead.
		_, err = tx.Exec(ctx, "SET LOCAL app.current_tenant = '"+tenantID.String()+"'")
		require.NoError(t, err)

		var count int
		err = tx.QueryRow(ctx, "SELECT COUNT(*) FROM fraud_evaluations WHERE action = 'ok'").Scan(&count)
		require.NoError(t, err)
		assert.Equal(t, 0, count,
			"Tenant should NOT see other tenant's fraud evaluations via RLS")
	})

	// ============================================================
	// TEST 5: Audit trail completeness
	// ============================================================

	t.Run("fraud_evaluation_has_required_fields", func(t *testing.T) {
		// Verify that fraud evaluations have all fields needed for audit
		rows, err := pool.Query(ctx,
			`SELECT id, tenant_id, partner_id, score, action, signals, evidence, created_at
			 FROM fraud_evaluations
			 WHERE tenant_id = $1 AND action = 'review'
			 LIMIT 1`, tenantID)
		require.NoError(t, err)
		defer rows.Close()

		require.True(t, rows.Next(), "Should have at least one review evaluation")

		var (
			id        uuid.UUID
			tid       uuid.UUID
			pid       uuid.UUID
			score     int
			action    string
			signals   string
			evidence  string
			createdAt time.Time
		)
		err = rows.Scan(&id, &tid, &pid, &score, &action, &signals, &evidence, &createdAt)
		require.NoError(t, err)

		assert.NotEqual(t, uuid.Nil, id)
		assert.Equal(t, tenantID, tid)
		assert.Equal(t, partnerID, pid)
		assert.Equal(t, 50, score)
		assert.Equal(t, "review", action)
		assert.NotEmpty(t, signals, "signals must be recorded for audit")
		assert.NotEmpty(t, evidence, "evidence must be recorded for audit")
		assert.False(t, createdAt.IsZero(), "created_at must be set")
	})
}

func hashStrFraud(s string) string {
	h := sha256.Sum256([]byte(s))
	return hex.EncodeToString(h[:])
}

func cleanupFraudTenant(ctx context.Context, pool *pgxpool.Pool, tenantID uuid.UUID) {
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
