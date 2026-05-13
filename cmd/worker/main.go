package main

import (
	"context"
	"flag"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	"github.com/indica-ai/indica-ai/internal/domain/rules"
	"github.com/indica-ai/indica-ai/internal/platform/config"
	"github.com/indica-ai/indica-ai/internal/platform/db"
	"github.com/indica-ai/indica-ai/internal/platform/observability"
	"github.com/indica-ai/indica-ai/internal/workers/attribution"
	"github.com/indica-ai/indica-ai/internal/workers/payouts"
)

func main() {
	runOncePayouts := flag.Bool("run-once-payouts", false, "Run CreatePayoutsJob once and exit")
	flag.Parse()

	cfg, err := config.Load()
	if err != nil {
		slog.Error("failed to load config", "error", err)
		os.Exit(1)
	}

	logger := observability.NewLogger(cfg.LogLevel, cfg.LogFormat)
	slog.SetDefault(logger)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	pool, err := db.NewPool(ctx, cfg.DatabaseURL)
	if err != nil {
		logger.Error("failed to connect to database", "error", err)
		os.Exit(1)
	}
	defer pool.Close()

	// Rules engine
	engine := rules.NewEngine()

	// Attribution worker
	attrWorker := attribution.NewWorker(pool.Pool, engine)
	logger.Info("attribution worker ready")

	// --run-once-payouts: run the job once and exit
	if *runOncePayouts {
		logger.Info("running CreatePayoutsJob once")
		if err := payouts.RunCreatePayoutsJob(ctx, pool.Pool, logger); err != nil {
			logger.Error("CreatePayoutsJob failed", "error", err)
			os.Exit(1)
		}
		logger.Info("CreatePayoutsJob completed successfully")
		return
	}

	// Schedule CreatePayoutsJob daily at 03:00 UTC
	go payouts.ScheduleCreatePayoutsJob(ctx, pool.Pool, logger)

	// Signal handling
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)

	logger.Info("worker starting")
	<-sigCh
	logger.Info("worker shutting down")
	_ = attrWorker
}
