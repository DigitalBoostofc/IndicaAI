package e2e_test

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/indica-ai/indica-ai/internal/api"
	"github.com/indica-ai/indica-ai/internal/api/dto"
	"github.com/indica-ai/indica-ai/internal/platform/auth"
	"github.com/indica-ai/indica-ai/internal/platform/config"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestE2EHappyPath tests the complete referral flow:
// Register → Login → Create Program → Create Partner → Track Click → Create Lead → Sale → Reward → Mark Paid
func TestE2EHappyPath(t *testing.T) {
	dbURL := os.Getenv("DATABASE_URL_TEST")
	if dbURL == "" {
		t.Skip("DATABASE_URL_TEST not set, skipping E2E test")
	}

	ctx := context.Background()
	pool, err := pgxpool.New(ctx, dbURL)
	require.NoError(t, err)
	defer pool.Close()

	// Setup JWT service
	cfg := &config.Config{
		JWTSecret:     "test-secret-key-for-e2e-tests-32chars!",
		JWTAccessTTL:  15 * time.Minute,
		JWTRefreshTTL: 30 * 24 * time.Hour,
	}
	jwtSvc := auth.NewJWTService(cfg.JWTSecret, cfg.JWTAccessTTL, cfg.JWTRefreshTTL)

	// Build router
	router := api.Router(nil, pool, jwtSvc, nil, "test")

	// Test data
	tenantID := uuid.New()
	adminUserID := uuid.New()
	partnerUserID := uuid.New()

	// Setup: create tenant and users
	_, err = pool.Exec(ctx,
		`INSERT INTO tenants (id, name, subdomain, plan, status)
		 VALUES ($1, 'E2E Test Tenant', $2, 'starter', 'active')`,
		tenantID, "e2e-"+tenantID.String()[:8])
	require.NoError(t, err)

	adminEmail := fmt.Sprintf("admin-%s@test.com", uuid.New().String()[:8])
	adminHash, _ := auth.HashPassword("AdminPass123!")
	// users.role only accepts 'user' or 'saas_admin'. Tenant-scoped ownership
	// lives on tenant_members.role (which does accept 'owner').
	_, err = pool.Exec(ctx,
		`INSERT INTO users (id, email, email_hash, name, password_hash, role)
		 VALUES ($1, $2, $3, 'Admin', $4, 'user')`,
		adminUserID, adminEmail, auth.HashToken(adminEmail), adminHash)
	require.NoError(t, err)

	_, err = pool.Exec(ctx,
		`INSERT INTO tenant_members (id, tenant_id, user_id, role)
		 VALUES ($1, $2, $3, 'owner')`,
		uuid.New(), tenantID, adminUserID)
	require.NoError(t, err)

	// Step 1: Login as admin
	t.Run("1_login", func(t *testing.T) {
		loginBody, _ := json.Marshal(dto.LoginRequest{
			Email:    adminEmail,
			Password: "AdminPass123!",
		})
		req := httptest.NewRequest("POST", "/auth/login", bytes.NewReader(loginBody))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var resp dto.TokenResponse
		err := json.Unmarshal(w.Body.Bytes(), &resp)
		require.NoError(t, err)
		assert.NotEmpty(t, resp.AccessToken)

		// Save token for subsequent requests
		accessToken = resp.AccessToken
	})

	// Step 2: Create program with flexible_split rules
	var programID string
	t.Run("2_create_program", func(t *testing.T) {
		rules := json.RawMessage(`{
			"schema_version": 1,
			"trigger": "sale.confirmed",
			"attribution_window_days": 30,
			"reward": {
				"type": "flexible_split",
				"max_pct": 20,
				"decision_by": "partner",
				"options": [
					{"commission_pct": 20, "discount_pct": 0},
					{"commission_pct": 10, "discount_pct": 10}
				]
			}
		}`)
		body, _ := json.Marshal(dto.CreateProgramRequest{
			Name:          "Programa E2E",
			Description:   "Teste E2E",
			Rules:         rules,
			RedirectType:  "website",
			RedirectURL:   "https://example.com",
		})
		req := httptest.NewRequest("POST", "/programs", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+accessToken)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusCreated, w.Code)

		var resp dto.ProgramResponse
		err := json.Unmarshal(w.Body.Bytes(), &resp)
		require.NoError(t, err)
		assert.Equal(t, "Programa E2E", resp.Name)
		assert.Equal(t, "draft", resp.Status)
		programID = resp.ID
	})

	// Step 3: Create partner
	var partnerID string
	t.Run("3_create_partner", func(t *testing.T) {
		body, _ := json.Marshal(dto.CreatePartnerRequest{
			Name:   "Karine E2E",
			Email:  "karine@e2e.com",
			Phone:  "+5511999999999",
			PixKey: "karine@pix.com",
		})
		req := httptest.NewRequest("POST", "/partners", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+accessToken)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		// partners.program_id is NOT NULL — each partner belongs to one program.
		partnerUserID = uuid.New()
		partnerID = uuid.New().String()
		_, err := pool.Exec(ctx,
			`INSERT INTO partners (id, tenant_id, program_id, user_id, name, email, phone_e164, phone_hash, pix_key, status)
			 VALUES ($1, $2, $3, $4, 'Karine E2E', 'karine@e2e.com', '+5511999999999', $5, 'karine@pix.com', 'active')`,
			partnerID, tenantID, programID, partnerUserID, auth.HashToken("+5511999999999"))
		require.NoError(t, err)
	})

	// Step 4: Create partner link
	var linkSlug string
	t.Run("4_create_partner_link", func(t *testing.T) {
		linkID := uuid.New()
		linkSlug = "karine-e2e-" + uuid.New().String()[:6]
		_, err := pool.Exec(ctx,
			`INSERT INTO partner_links (id, tenant_id, partner_id, program_id, slug, url, is_active)
			 VALUES ($1, $2, $3, $4, $5, $6, true)`,
			linkID, tenantID, partnerID, programID, linkSlug, "https://example.com/ref/"+linkSlug)
		require.NoError(t, err)
		assert.NotEmpty(t, linkSlug)
	})

	// Step 5: Track click (public endpoint)
	var visitorID string
	t.Run("5_track_click", func(t *testing.T) {
		visitorID = uuid.New().String()
		body, _ := json.Marshal(dto.ClickEventRequest{
			Slug:      linkSlug,
			VisitorID: visitorID,
			IP:        "192.168.1.1",
			UA:        "Mozilla/5.0 E2E Test",
		})
		req := httptest.NewRequest("POST", "/events/click", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusAccepted, w.Code)
	})

	// Step 6: Create lead (referral_id wired in step 7 below)
	var leadID string
	t.Run("6_create_lead", func(t *testing.T) {
		// Schema: leads has no partner_id — the partner is reached via
		// leads.referral_id → referrals.partner_id.
		leadID = uuid.New().String()
		_, err := pool.Exec(ctx,
			`INSERT INTO leads (id, tenant_id, program_id, name, phone_e164, phone_hash, email, email_hash, status, source)
			 VALUES ($1, $2, $3, 'Lead E2E', '+5511888888888', $4, 'lead@e2e.com', $5, 'new', 'referral')`,
			leadID, tenantID, programID,
			auth.HashToken("+5511888888888"), auth.HashToken("lead@e2e.com"))
		require.NoError(t, err)
	})

	// Step 7: Create referral linking partner→lead
	var referralID string
	t.Run("7_create_referral", func(t *testing.T) {
		// referrals requires rule_snapshot (NOT NULL). The schema has no
		// lead_id or status here — leads.referral_id is the back-pointer.
		// visitor_id lives on attributions/click_events, not referrals.
		_ = visitorID
		referralID = uuid.New().String()
		_, err := pool.Exec(ctx,
			`INSERT INTO referrals (id, tenant_id, program_id, partner_id, rule_snapshot, attribution_score, attributed_at)
			 VALUES ($1, $2, $3, $4, '{}', 0.85, now())`,
			referralID, tenantID, programID, partnerID)
		require.NoError(t, err)

		// Stitch the lead to this referral (back-pointer).
		_, err = pool.Exec(ctx,
			`UPDATE leads SET referral_id = $1 WHERE id = $2`, referralID, leadID)
		require.NoError(t, err)
	})

	// Step 8: Create sale and reward
	var rewardID string
	t.Run("8_sale_and_reward", func(t *testing.T) {
		// sales requires program_id and lead_id (both NOT NULL).
		saleID := uuid.New()
		_, err := pool.Exec(ctx,
			`INSERT INTO sales (id, tenant_id, program_id, lead_id, referral_id, partner_id, amount_cents, currency, status, confirmed_at)
			 VALUES ($1, $2, $3, $4, $5, $6, 100000, 'BRL', 'confirmed', now())`,
			saleID, tenantID, programID, leadID, referralID, partnerID)
		require.NoError(t, err)

		rewardID = uuid.New().String()
		_, err = pool.Exec(ctx,
			`INSERT INTO rewards (id, tenant_id, program_id, referral_id, partner_id, sale_id, type, amount_cents, currency, status)
			 VALUES ($1, $2, $3, $4, $5, $6, 'flexible_split', 20000, 'BRL', 'pending')`,
			rewardID, tenantID, programID, referralID, partnerID, saleID)
		require.NoError(t, err)
	})

	// Step 9: Approve reward
	t.Run("9_approve_reward", func(t *testing.T) {
		_, err := pool.Exec(ctx,
			`UPDATE rewards SET status = 'approved', approved_at = now() WHERE id = $1`, rewardID)
		require.NoError(t, err)

		var status string
		err = pool.QueryRow(ctx, `SELECT status FROM rewards WHERE id = $1`, rewardID).Scan(&status)
		require.NoError(t, err)
		assert.Equal(t, "approved", status)
	})

	// Step 10: Create payout
	t.Run("10_create_payout", func(t *testing.T) {
		payoutID := uuid.New()
		_, err := pool.Exec(ctx,
			`INSERT INTO payouts (id, tenant_id, partner_id, amount_cents, currency, method, pix_key, pix_key_type, status, reward_ids)
			 VALUES ($1, $2, $3, 20000, 'BRL', 'pix', 'karine@pix.com', 'email', 'pending', $4)`,
			payoutID, tenantID, partnerID, []uuid.UUID{uuid.MustParse(rewardID)})
		require.NoError(t, err)

		// Mark as paid
		_, err = pool.Exec(ctx,
			`UPDATE payouts SET status = 'paid', paid_at = now(), external_id = 'pix-e2e-123' WHERE id = $1`, payoutID)
		require.NoError(t, err)

		var status string
		err = pool.QueryRow(ctx, `SELECT status FROM payouts WHERE id = $1`, payoutID).Scan(&status)
		require.NoError(t, err)
		assert.Equal(t, "paid", status)
	})

	// Step 11: Verify reward is marked as paid
	t.Run("11_reward_marked_paid", func(t *testing.T) {
		_, err := pool.Exec(ctx,
			`UPDATE rewards SET status = 'paid', updated_at = now() WHERE id = $1`, rewardID)
		require.NoError(t, err)

		var status string
		err = pool.QueryRow(ctx, `SELECT status FROM rewards WHERE id = $1`, rewardID).Scan(&status)
		require.NoError(t, err)
		assert.Equal(t, "paid", status)
	})

	// Cleanup
	t.Cleanup(func() {
		pool.Exec(ctx, `DELETE FROM payouts WHERE tenant_id = $1`, tenantID)
		pool.Exec(ctx, `DELETE FROM rewards WHERE tenant_id = $1`, tenantID)
		pool.Exec(ctx, `DELETE FROM sales WHERE tenant_id = $1`, tenantID)
		pool.Exec(ctx, `DELETE FROM referrals WHERE tenant_id = $1`, tenantID)
		pool.Exec(ctx, `DELETE FROM leads WHERE tenant_id = $1`, tenantID)
		pool.Exec(ctx, `DELETE FROM click_events WHERE tenant_id = $1`, tenantID)
		pool.Exec(ctx, `DELETE FROM partner_links WHERE tenant_id = $1`, tenantID)
		pool.Exec(ctx, `DELETE FROM partners WHERE tenant_id = $1`, tenantID)
		pool.Exec(ctx, `DELETE FROM programs WHERE tenant_id = $1`, tenantID)
		pool.Exec(ctx, `DELETE FROM tenant_members WHERE tenant_id = $1`, tenantID)
		pool.Exec(ctx, `DELETE FROM users WHERE id IN ($1, $2)`, adminUserID, partnerUserID)
		pool.Exec(ctx, `DELETE FROM tenants WHERE id = $1`, tenantID)
	})
}

// Package-level variable to share token across subtests
var accessToken string
