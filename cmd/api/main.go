package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/indica-ai/indica-ai/internal/api"
	"github.com/indica-ai/indica-ai/internal/platform/auth"
	"github.com/indica-ai/indica-ai/internal/platform/cache"
	"github.com/indica-ai/indica-ai/internal/platform/config"
	"github.com/indica-ai/indica-ai/internal/platform/db"
	"github.com/indica-ai/indica-ai/internal/platform/observability"
	"github.com/jackc/pgx/v5/pgxpool"
)

func main() {
	// Load config
	cfg, err := config.Load()
	if err != nil {
		slog.Error("failed to load config", "error", err)
		os.Exit(1)
	}

	// Logger
	logger := observability.NewLogger(cfg.LogLevel, cfg.LogFormat)
	slog.SetDefault(logger)

	// Context
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Database
	pool, err := db.NewPool(ctx, cfg.DatabaseURL)
	if err != nil {
		logger.Error("failed to connect to database", "error", err)
		os.Exit(1)
	}
	defer pool.Close()
	logger.Info("connected to database")

	// Redis (optional — don't fail if unavailable)
	var redisClient *cache.Client
	redisClient, err = cache.New(ctx, cfg.RedisURL)
	if err != nil {
		logger.Warn("redis unavailable, rate limiting disabled", "error", err)
	} else {
		defer redisClient.Close()
		logger.Info("connected to redis")
	}

	// JWT service
	jwtSvc := auth.NewJWTService(cfg.JWTSecret, cfg.JWTAccessTTL, cfg.JWTRefreshTTL)

	// Build router
	handler := api.Router(logger, pool.Pool, jwtSvc, redisClient, cfg.AppEnv)

	// HTTP server
	srv := &http.Server{
		Addr:         cfg.HTTPAddr,
		Handler:      handler,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Graceful shutdown
	go func() {
		sigCh := make(chan os.Signal, 1)
		signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
		<-sigCh
		logger.Info("shutting down...")
		shutdownCtx, shutdownCancel := context.WithTimeout(ctx, 30*time.Second)
		defer shutdownCancel()
		srv.Shutdown(shutdownCtx)
		cancel()
	}()

	logger.Info("starting API server", "addr", cfg.HTTPAddr)
	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		logger.Error("server error", "error", err)
		os.Exit(1)
	}
}

// Ensure pgxpool.Pool satisfies the interface
var _ *pgxpool.Pool
