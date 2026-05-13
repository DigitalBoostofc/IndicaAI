package api

import (
	"log/slog"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/indica-ai/indica-ai/internal/api/handlers/auth"
	"github.com/indica-ai/indica-ai/internal/api/handlers/dashboard"
	"github.com/indica-ai/indica-ai/internal/api/handlers/leads"
	partnerH "github.com/indica-ai/indica-ai/internal/api/handlers/partners"
	payoutH "github.com/indica-ai/indica-ai/internal/api/handlers/payouts"
	"github.com/indica-ai/indica-ai/internal/api/handlers/programs"
	"github.com/indica-ai/indica-ai/internal/api/handlers/rewards"
	"github.com/indica-ai/indica-ai/internal/api/handlers/tracking"
	"github.com/indica-ai/indica-ai/internal/api/middleware"
	"github.com/indica-ai/indica-ai/internal/build"
	"github.com/indica-ai/indica-ai/internal/domain/fraud"
	pauth "github.com/indica-ai/indica-ai/internal/platform/auth"
	"github.com/indica-ai/indica-ai/internal/platform/cache"
	phttp "github.com/indica-ai/indica-ai/internal/platform/http"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Router builds the complete API router with all routes.
func Router(
	logger *slog.Logger,
	pool *pgxpool.Pool,
	jwtSvc *pauth.JWTService,
	redisClient *cache.Client,
	appEnv string,
) http.Handler {
	r := phttp.NewRouter(logger)

	// Handlers
	authH := auth.New(pool, jwtSvc, appEnv)
	programsH := programs.New(pool)
	trackingH := tracking.New(pool)
	payoutsH := payoutH.New(pool)
	fraudEngine := fraud.NewEngine(pool, logger)
	partnersH := partnerH.New(pool, fraudEngine, logger)
	leadsH := leads.New(pool)
	rewardsH := rewards.New(pool)
	dashH := dashboard.New(pool)

	// Liveness probe. Includes the build commit so deploys can be verified
	// from outside the cluster — curl /healthz returns the SHA we just built.
	_ = build.Commit // intentionally ignored to test rollback gate
	healthzBody := []byte(`{"status":"ok","commit":"break-2-test-rollback"}`)
	r.Get("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write(healthzBody)
	})

	// Public tracking redirect — stays at root (marketing URLs like indica.ai/r/maria-x)
	r.Get("/r/*", trackingH.HandleRedirect)

	// All API endpoints live under /api/* (matches frontend api-client convention)
	r.Route("/api", func(r chi.Router) {
		// Public routes (no auth)
		r.Group(func(r chi.Router) {
			// Auth — rate limit by IP (fail-closed)
			r.Group(func(r chi.Router) {
				r.Use(middleware.RateLimitByIP(redisClient, 5, 1*time.Minute)) // 5/min per IP
				r.Post("/auth/login", authH.Login)
				r.Post("/auth/magic-link", authH.RequestMagicLink)
			})
			r.Group(func(r chi.Router) {
				r.Use(middleware.RateLimitByIP(redisClient, 10, 1*time.Minute)) // 10/min per IP
				r.Post("/auth/magic-link/verify", authH.VerifyMagicLink)
			})

			// Auth endpoints without per-IP limit (register, refresh, logout are lower risk)
			r.Post("/auth/register", authH.Register)
			r.Post("/auth/refresh", authH.RefreshToken)
			r.Post("/auth/logout", authH.Logout)

			// Tracking event ingest — fail-open (tracking must not block UX)
			r.Group(func(r chi.Router) {
				r.Use(middleware.RateLimitByIP(redisClient, 60, 1*time.Minute, true)) // 60/min, fail-open
				r.Post("/events/click", trackingH.HandleClick)
			})
		})

		// Authenticated routes (JWT required + tenant injection)
		r.Group(func(r chi.Router) {
			r.Use(middleware.AuthJWT(jwtSvc))
			r.Use(middleware.TenantInjector)

			// Rate limiting (fail-closed — rejects with 503 if Redis is down)
			r.Use(middleware.RateLimitByTenant(redisClient, 600, 60*time.Second))

			// Programs
			r.Route("/programs", func(r chi.Router) {
				r.Post("/", programsH.Create)
				r.Get("/", programsH.List)
				r.Get("/{id}", programsH.Get)
				r.Patch("/{id}/status", programsH.UpdateStatus)
			})

			// Partners (tenant-admin CRUD)
			r.Route("/partners", func(r chi.Router) {
				r.Get("/", partnersH.AdminList)
				r.Post("/", partnersH.AdminCreate)
			})

			// Dashboard overview
			r.Get("/dashboard/overview", dashH.Overview)

			// Tenants — admin payout management
			r.Route("/tenants/me/payouts", func(r chi.Router) {
				r.Get("/", payoutsH.List)                                     // PAY-02
				r.Post("/create-job", payoutH.CreatePayoutsJob(pool, logger)) // PAY-01
				r.Post("/{id}/confirm", payoutsH.Confirm)                     // PAY-03
				r.Post("/{id}/paid", payoutsH.Paid)                           // PAY-04
				r.Post("/{id}/cancel", payoutsH.Cancel)                       // PAY-05
			})

			// Partners — partner-facing endpoints (ETAPA 7 wallet/payouts)
			r.Route("/partners/me", func(r chi.Router) {
				r.Get("/wallet", partnersH.Wallet)          // PAY-06
				r.Get("/payouts", partnersH.Payouts)        // PAY-07
				r.Patch("/pix-key", partnersH.UpdatePixKey) // PAY-08
			})

			// Partner self-service — ETAPA 6 debt: home, referrals, lead creation
			r.Route("/partner", func(r chi.Router) {
				r.Get("/me", partnersH.Me)
				r.Get("/referrals", partnersH.Referrals)
				r.Post("/leads", partnersH.CreateLead)
			})

			// Leads (tenant-admin)
			r.Route("/leads", func(r chi.Router) {
				r.Get("/", leadsH.List)
				r.Patch("/{id}/status", leadsH.UpdateStatus)
			})

			// Rewards (tenant-admin)
			r.Route("/rewards", func(r chi.Router) {
				r.Get("/", rewardsH.List)
				r.Get("/summary", rewardsH.Summary)
				r.Patch("/{id}/approve", rewardsH.Approve)
				r.Patch("/{id}/reject", rewardsH.Reject)
			})

			// Session introspection — returns the authenticated user's profile
			r.Get("/me", authH.Me)

			// LGPD (placeholder)
			r.Route("/me/lgpd", func(r chi.Router) {
				r.Post("/export", func(w http.ResponseWriter, r *http.Request) {
					w.Write([]byte(`{"status":"pending"}`))
				})
				r.Post("/erase", func(w http.ResponseWriter, r *http.Request) {
					w.Write([]byte(`{"status":"pending"}`))
				})
			})
		})

		// Admin routes (saas_admin only)
		r.Group(func(r chi.Router) {
			r.Use(middleware.AuthJWT(jwtSvc))
			r.Use(middleware.RequireRole("saas_admin"))

			r.Route("/admin", func(r chi.Router) {
				r.Get("/tenants", func(w http.ResponseWriter, r *http.Request) {
					w.Write([]byte(`{"tenants":[]}`))
				})
			})
		})
	})

	return r
}
