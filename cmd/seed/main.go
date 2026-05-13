package main

import (
	"context"
	"encoding/json"
	"log/slog"
	"os"

	"github.com/google/uuid"
	"github.com/indica-ai/indica-ai/internal/platform/auth"
	"github.com/indica-ai/indica-ai/internal/platform/config"
	"github.com/indica-ai/indica-ai/internal/platform/db"
	"github.com/indica-ai/indica-ai/internal/platform/observability"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		slog.Error("failed to load config", "error", err)
		os.Exit(1)
	}

	logger := observability.NewLogger(cfg.LogLevel, cfg.LogFormat)
	slog.SetDefault(logger)

	ctx := context.Background()
	pool, err := db.NewPool(ctx, cfg.DatabaseURL)
	if err != nil {
		logger.Error("failed to connect to database", "error", err)
		os.Exit(1)
	}
	defer pool.Close()

	// Seed tenant
	tenantID := uuid.New()
	_, err = pool.Exec(ctx,
		`INSERT INTO tenants (id, name, subdomain, plan, status) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING`,
		tenantID, "Wenox Demo", "wenox", "pro", "active")
	if err != nil {
		logger.Error("failed to seed tenant", "error", err)
		os.Exit(1)
	}

	// Seed admin user
	userID := uuid.New()
	emailHash := auth.HashToken("admin@wenox.com")
	hash, _ := auth.HashPassword("admin123456")
	_, err = pool.Exec(ctx,
		`INSERT INTO users (id, email, email_hash, name, password_hash, role, email_verified)
		 VALUES ($1, $2, $3, $4, $5, $6, true) ON CONFLICT DO NOTHING`,
		userID, "admin@wenox.com", emailHash, "Admin Wenox", hash, "user")
	if err != nil {
		logger.Error("failed to seed user", "error", err)
		os.Exit(1)
	}

	// Add user as tenant member
	_, err = pool.Exec(ctx,
		`INSERT INTO tenant_members (id, tenant_id, user_id, role, joined_at)
		 VALUES ($1, $2, $3, $4, now()) ON CONFLICT DO NOTHING`,
		uuid.New(), tenantID, userID, "owner")
	if err != nil {
		logger.Error("failed to seed tenant member", "error", err)
		os.Exit(1)
	}

	// Seed program (Wenox 20% flexible split)
	programID := uuid.New()
	rulesJSON, _ := json.Marshal(map[string]interface{}{
		"schema_version":          1,
		"trigger":                 "sale.confirmed",
		"attribution_window_days": 30,
		"conditions": []map[string]interface{}{
			{"op": "eq", "field": "lead.status", "value": "closed"},
		},
		"reward": map[string]interface{}{
			"type":        "flexible_split",
			"max_pct":     20,
			"decision_by": "partner",
			"options": []map[string]interface{}{
				{"commission_pct": 20, "discount_pct": 0},
				{"commission_pct": 10, "discount_pct": 10},
				{"commission_pct": 0, "discount_pct": 20},
				{"kind": "custom", "max_total_pct": 20},
			},
		},
		"payout": map[string]interface{}{
			"method":   "pix",
			"schedule": "on_approval",
		},
	})
	_, err = pool.Exec(ctx,
		`INSERT INTO programs (id, tenant_id, name, description, status, rules, redirect_type, redirect_url)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT DO NOTHING`,
		programID, tenantID, "Programa Wenox", "Programa de indicação Wenox 20% flexível", "active",
		rulesJSON, "website", "https://wenox.com.br")
	if err != nil {
		logger.Error("failed to seed program", "error", err)
		os.Exit(1)
	}

	// Seed partner
	partnerID := uuid.New()
	partnerEmailHash := auth.HashToken("karine@email.com")
	_, err = pool.Exec(ctx,
		`INSERT INTO partners (id, tenant_id, program_id, name, email, email_hash, phone_e164, phone_hash, status)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT DO NOTHING`,
		partnerID, tenantID, programID, "Karine", "karine@email.com", partnerEmailHash,
		"+5511999999999", auth.HashToken("+5511999999999"), "active")
	if err != nil {
		logger.Error("failed to seed partner", "error", err)
		os.Exit(1)
	}

	// Seed partner link
	slug := "karine-8xk92a"
	_, err = pool.Exec(ctx,
		`INSERT INTO partner_links (id, tenant_id, program_id, partner_id, slug, url, is_active)
		 VALUES ($1, $2, $3, $4, $5, $6, true) ON CONFLICT DO NOTHING`,
		uuid.New(), tenantID, programID, partnerID, slug,
		"https://r.indica.ai/r/"+slug)
	if err != nil {
		logger.Error("failed to seed partner link", "error", err)
		os.Exit(1)
	}

	logger.Info("seed completed",
		"tenant_id", tenantID.String(),
		"user_id", userID.String(),
		"program_id", programID.String(),
		"partner_id", partnerID.String(),
		"slug", slug,
	)
}
