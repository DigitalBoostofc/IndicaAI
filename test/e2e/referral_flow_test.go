package e2e_test

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/indica-ai/indica-ai/internal/api/handlers/auth"
	"github.com/indica-ai/indica-ai/internal/api/handlers/partners"
	"github.com/indica-ai/indica-ai/internal/api/handlers/payouts"
	"github.com/indica-ai/indica-ai/internal/api/handlers/programs"
	"github.com/indica-ai/indica-ai/internal/api/handlers/tracking"
	"github.com/indica-ai/indica-ai/internal/api/middleware"
	"github.com/indica-ai/indica-ai/internal/domain/fraud"
	pauth "github.com/indica-ai/indica-ai/internal/platform/auth"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestE2EReferralFlow tests the complete referral lifecycle:
// 1. Register user → Login → Get token
// 2. Create program
// 3. Create partner (via DB — handler is placeholder)
// 4. Track click
// 5. Create lead
// 6. Approve reward
// 7. Create payout → Confirm → Mark paid
//
// Requires DATABASE_URL_TEST env var.
func TestE2EReferralFlow(t *testing.T) {
	dbURL := os.Getenv("DATABASE_URL_TEST")
	if dbURL == "" {
		t.Skip("DATABASE_URL_TEST not set, skipping E2E referral flow test")
	}

	ctx := context.Background()
	pool, err := pgxpool.New(ctx, dbURL)
	require.NoError(t, err)
	defer pool.Close()

	// Setup services
	jwtSecret := "test-secret-key-for-e2e-flow-32char!"
	jwtSvc := pauth.NewJWTService(jwtSecret, 15*time.Minute, 30*24*time.Hour)
	logger := slog.New(slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{Level: slog.LevelError}))
	fraudEngine := fraud.NewEngine(pool, logger)

	// Build test router (no Redis — rate limiting skipped)
	router := buildE2ERouter(pool, jwtSvc, fraudEngine, logger, "test")

	// Test data
	tenantID := uuid.New()
	adminUserID := uuid.New()

	// Cleanup
	t.Cleanup(func() {
		cleanupE2E(ctx, pool, tenantID, adminUserID)
	})

	// ============================================================
	// SETUP: create tenant + admin user + membership
	// ============================================================

	_, err = pool.Exec(ctx,
		`INSERT INTO tenants (id, name, subdomain, plan, status)
		 VALUES ($1, 'E2E Flow Tenant', $2, 'starter', 'active')`,
		tenantID, "e2e-flow-"+tenantID.String()[:8])
	require.NoError(t, err)

	adminEmail := fmt.Sprintf("admin-%s@e2e.test", uuid.New().String()[:8])
	adminHash, err := pauth.HashPassword("AdminPass123!")
	require.NoError(t, err)
	_, err = pool.Exec(ctx,
		`INSERT INTO users (id, email, email_hash, name, password_hash, role)
		 VALUES ($1, $2, $3, 'E2E Admin', $4, 'user')`,
		adminUserID, adminEmail, hashStrE2E(adminEmail), adminHash)
	require.NoError(t, err)

	_, err = pool.Exec(ctx,
		`INSERT INTO tenant_members (id, tenant_id, user_id, role)
		 VALUES ($1, $2, $3, 'owner')`,
		uuid.New(), tenantID, adminUserID)
	require.NoError(t, err)

	var accessToken string
	var programID string
	var partnerID string
	var leadID string
	var referralID string
	var rewardID string

	// ============================================================
	// STEP 1: Login as admin
	// ============================================================

	t.Run("01_login", func(t *testing.T) {
		body, _ := json.Marshal(map[string]string{
			"email":    adminEmail,
			"password": "AdminPass123!",
		})
		req := httptest.NewRequest("POST", "/api/auth/login", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		require.Equal(t, http.StatusOK, w.Code, "login should return 200: %s", w.Body.String())

		var resp struct {
			AccessToken  string `json:"access_token"`
			RefreshToken string `json:"refresh_token"`
		}
		require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
		require.NotEmpty(t, resp.AccessToken, "access_token should not be empty")
		accessToken = resp.AccessToken
	})

	// ============================================================
	// STEP 2: Create program
	// ============================================================

	t.Run("02_create_program", func(t *testing.T) {
		rules := json.RawMessage(`{
			"schema_version": 1,
			"trigger": "sale.confirmed",
			"attribution_window_days": 30,
			"reward": {
				"type": "commission_fixed",
				"amount_brl": 100
			}
		}`)
		body, _ := json.Marshal(map[string]any{
			"name":          "Programa E2E Flow",
			"description":   "Teste E2E completo",
			"rules":         rules,
			"redirect_type": "website",
			"redirect_url":  "https://example.com",
		})
		req := httptest.NewRequest("POST", "/api/programs", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+accessToken)
		req.Header.Set("X-Tenant-ID", tenantID.String())
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		require.Equal(t, http.StatusCreated, w.Code, "create program: %s", w.Body.String())

		var resp struct {
			ID     string `json:"id"`
			Name   string `json:"name"`
			Status string `json:"status"`
		}
		require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
		assert.Equal(t, "Programa E2E Flow", resp.Name)
		programID = resp.ID
	})

	// ============================================================
	// STEP 3: Create partner (direct DB — handler is placeholder)
	// ============================================================

	t.Run("03_create_partner", func(t *testing.T) {
		partnerID = uuid.New().String()
		phone := "+5511999998888"
		_, err := pool.Exec(ctx,
			`INSERT INTO partners (id, tenant_id, program_id, name, email, phone_e164, phone_hash, pix_key, status)
			 VALUES ($1, $2, $3, 'Partner E2E', 'partner@e2e.test', $4, $5, 'partner@pix.com', 'active')`,
			partnerID, tenantID, programID, phone, hashStrE2E(phone))
		require.NoError(t, err)
	})

	// ============================================================
	// STEP 4: Create partner link
	// ============================================================

	var linkSlug string
	t.Run("04_create_partner_link", func(t *testing.T) {
		linkSlug = "e2e-flow-" + uuid.New().String()[:6]
		_, err := pool.Exec(ctx,
			`INSERT INTO partner_links (id, tenant_id, partner_id, program_id, slug, url, is_active)
			 VALUES ($1, $2, $3, $4, $5, $6, true)`,
			uuid.New(), tenantID, partnerID, programID, linkSlug,
			"https://example.com/r/"+linkSlug)
		require.NoError(t, err)
	})

	// ============================================================
	// STEP 5: Track click (public endpoint)
	// ============================================================

	var visitorID string
	t.Run("05_track_click", func(t *testing.T) {
		visitorID = uuid.New().String()
		body, _ := json.Marshal(map[string]string{
			"slug":       linkSlug,
			"visitor_id": visitorID,
			"ip":         "192.168.1.100",
			"user_agent": "Mozilla/5.0 E2E Flow Test",
		})
		req := httptest.NewRequest("POST", "/api/events/click", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusAccepted, w.Code, "click event: %s", w.Body.String())
	})

	// ============================================================
	// STEP 6: Create lead + referral (direct DB)
	// ============================================================

	t.Run("06_create_lead_and_referral", func(t *testing.T) {
		// leads has no partner_id; the partner is reached via referral_id
		// (back-pointer). visitor_id is recorded on click_events, not referrals.
		_ = visitorID
		leadID = uuid.New().String()
		leadPhone := "+5511888887777"
		_, err := pool.Exec(ctx,
			`INSERT INTO leads (id, tenant_id, program_id, name, phone_e164, phone_hash, email, email_hash, status, source)
			 VALUES ($1, $2, $3, 'Lead E2E Flow', $4, $5, 'lead@e2e.test', $6, 'new', 'referral')`,
			leadID, tenantID, programID,
			leadPhone, hashStrE2E(leadPhone), hashStrE2E("lead@e2e.test"))
		require.NoError(t, err)

		referralID = uuid.New().String()
		_, err = pool.Exec(ctx,
			`INSERT INTO referrals (id, tenant_id, program_id, partner_id, rule_snapshot, attribution_score, attributed_at)
			 VALUES ($1, $2, $3, $4, '{}', 0.85, now())`,
			referralID, tenantID, programID, partnerID)
		require.NoError(t, err)

		_, err = pool.Exec(ctx,
			`UPDATE leads SET referral_id = $1 WHERE id = $2`, referralID, leadID)
		require.NoError(t, err)
	})

	// ============================================================
	// STEP 7: Create sale + reward
	// ============================================================

	t.Run("07_create_sale_and_reward", func(t *testing.T) {
		saleID := uuid.New()
		_, err := pool.Exec(ctx,
			`INSERT INTO sales (id, tenant_id, program_id, lead_id, referral_id, partner_id, amount_cents, currency, status)
			 VALUES ($1, $2, $3, $4, $5, $6, 100000, 'BRL', 'confirmed')`,
			saleID, tenantID, programID, leadID, referralID, partnerID)
		require.NoError(t, err)

		rewardID = uuid.New().String()
		_, err = pool.Exec(ctx,
			`INSERT INTO rewards (id, tenant_id, program_id, referral_id, partner_id, sale_id, type, amount_cents, currency, status)
			 VALUES ($1, $2, $3, $4, $5, $6, 'commission_fixed', 10000, 'BRL', 'pending')`,
			rewardID, tenantID, programID, referralID, partnerID, saleID)
		require.NoError(t, err)
	})

	// ============================================================
	// STEP 8: Approve reward
	// ============================================================

	t.Run("08_approve_reward", func(t *testing.T) {
		_, err := pool.Exec(ctx,
			`UPDATE rewards SET status = 'approved', approved_at = now() WHERE id = $1 AND tenant_id = $2`,
			rewardID, tenantID)
		require.NoError(t, err)

		var status string
		err = pool.QueryRow(ctx,
			`SELECT status FROM rewards WHERE id = $1`, rewardID).Scan(&status)
		require.NoError(t, err)
		assert.Equal(t, "approved", status)
	})

	// ============================================================
	// STEP 9: Create payout
	// ============================================================

	var payoutID string
	t.Run("09_create_payout", func(t *testing.T) {
		payoutID = uuid.New().String()
		_, err := pool.Exec(ctx,
			`INSERT INTO payouts (id, tenant_id, partner_id, amount_cents, currency, method, pix_key, pix_key_type, status, reward_ids)
			 VALUES ($1, $2, $3, 10000, 'BRL', 'pix', 'partner@pix.com', 'email', 'pending', $4)`,
			payoutID, tenantID, partnerID, []uuid.UUID{uuid.MustParse(rewardID)})
		require.NoError(t, err)
	})

	// ============================================================
	// STEP 10: Confirm payout via API
	// ============================================================

	t.Run("10_confirm_payout", func(t *testing.T) {
		req := httptest.NewRequest("POST",
			fmt.Sprintf("/api/tenants/me/payouts/%s/confirm", payoutID), nil)
		req.Header.Set("Authorization", "Bearer "+accessToken)
		req.Header.Set("X-Tenant-ID", tenantID.String())
		req.Header.Set("Idempotency-Key", "e2e-confirm-"+payoutID)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Contains(t, []int{http.StatusOK, http.StatusAccepted, http.StatusConflict}, w.Code,
			"confirm payout: %s", w.Body.String())
	})

	// ============================================================
	// STEP 11: Mark payout as paid
	// ============================================================

	t.Run("11_mark_paid", func(t *testing.T) {
		body, _ := json.Marshal(map[string]any{
			"external_id": "pix-e2e-flow-123",
		})
		req := httptest.NewRequest("POST",
			fmt.Sprintf("/api/tenants/me/payouts/%s/paid", payoutID),
			bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+accessToken)
		req.Header.Set("X-Tenant-ID", tenantID.String())
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Contains(t, []int{http.StatusOK, http.StatusAccepted}, w.Code,
			"mark paid: %s", w.Body.String())
	})

	// ============================================================
	// STEP 12: Verify final state in DB
	// ============================================================

	t.Run("12_verify_final_state", func(t *testing.T) {
		tx, err := pool.Begin(ctx)
		require.NoError(t, err)
		defer tx.Rollback(ctx)

		// pgx silently no-ops SET LOCAL bind params; interpolate the UUID instead.
		_, err = tx.Exec(ctx, "SET LOCAL app.current_tenant = '"+tenantID.String()+"'")
		require.NoError(t, err)

		var payoutStatus string
		err = tx.QueryRow(ctx, `SELECT status FROM payouts WHERE id = $1`, payoutID).Scan(&payoutStatus)
		require.NoError(t, err)
		assert.Equal(t, "paid", payoutStatus, "payout should be marked as paid")

		var rewardStatus string
		err = tx.QueryRow(ctx, `SELECT status FROM rewards WHERE id = $1`, rewardID).Scan(&rewardStatus)
		require.NoError(t, err)
		assert.Equal(t, "paid", rewardStatus, "reward should be marked as paid after payout")
	})
}

// buildE2ERouter creates a minimal router for E2E testing (no Redis).
func buildE2ERouter(pool *pgxpool.Pool, jwtSvc *pauth.JWTService, fraudEngine *fraud.Engine, logger *slog.Logger, appEnv string) http.Handler {
	r := chi.NewRouter()

	authH := auth.New(pool, jwtSvc, appEnv)
	programsH := programs.New(pool)
	trackingH := tracking.New(pool)
	partnersH := partners.New(pool, fraudEngine, logger)
	payoutsH := payouts.New(pool)

	r.Route("/api", func(r chi.Router) {
		// Public
		r.Post("/auth/login", authH.Login)
		r.Post("/auth/register", authH.Register)
		r.Post("/auth/refresh", authH.RefreshToken)
		r.Post("/events/click", trackingH.HandleClick)

		// Authenticated
		r.Group(func(r chi.Router) {
			r.Use(middleware.AuthJWT(jwtSvc))
			r.Use(middleware.TenantInjector)

			r.Route("/programs", func(r chi.Router) {
				r.Post("/", programsH.Create)
				r.Get("/", programsH.List)
			})

			r.Route("/tenants/me/payouts", func(r chi.Router) {
				r.Get("/", payoutsH.List)
				r.Post("/{id}/confirm", payoutsH.Confirm)
				r.Post("/{id}/paid", payoutsH.Paid)
				r.Post("/{id}/cancel", payoutsH.Cancel)
			})

			r.Route("/partners/me", func(r chi.Router) {
				r.Get("/wallet", partnersH.Wallet)
				r.Patch("/pix-key", partnersH.UpdatePixKey)
			})

			r.Route("/partner", func(r chi.Router) {
				r.Get("/me", partnersH.Me)
				r.Post("/leads", partnersH.CreateLead)
			})

			r.Get("/me", authH.Me)
		})
	})

	return r
}

func cleanupE2E(ctx context.Context, pool *pgxpool.Pool, tenantID, adminUID uuid.UUID) {
	tables := []string{
		"payouts", "rewards", "sales", "referrals", "leads",
		"click_events", "attributions", "partner_links", "partners",
		"programs", "tenant_members", "idempotency_keys",
	}
	for _, tbl := range tables {
		pool.Exec(ctx, fmt.Sprintf("DELETE FROM %s WHERE tenant_id = $1", tbl), tenantID)
	}
	pool.Exec(ctx, "DELETE FROM tenants WHERE id = $1", tenantID)
	pool.Exec(ctx, "DELETE FROM users WHERE id = $1", adminUID)
}

func hashStrE2E(s string) string {
	h := sha256.Sum256([]byte(s))
	return hex.EncodeToString(h[:])
}
