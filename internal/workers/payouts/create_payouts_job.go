package payouts

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

const defaultHoldDays = 7

// EligibleReward represents a reward that is ready to be paid out.
type EligibleReward struct {
	RewardID    uuid.UUID
	PartnerID   uuid.UUID
	TenantID    uuid.UUID
	AmountCents int64
	PixKey      string
	PixKeyType  string
}

// partnerKey groups rewards by partner within a tenant.
type partnerKey struct {
	PartnerID uuid.UUID
	TenantID  uuid.UUID
}

// partnerInfo holds aggregated data for a partner payout.
type partnerInfo struct {
	PixKey     string
	PixKeyType string
	Rewards    []EligibleReward
	TotalCents int64
}

// RunCreatePayoutsJob finds approved rewards whose hold period has expired,
// groups them by partner, and creates a payout for each eligible partner.
//
// A partner is skipped if:
//   - they have no pix_key configured
//   - they already have a pending payout (idempotency)
func RunCreatePayoutsJob(ctx context.Context, pool *pgxpool.Pool, log *slog.Logger) error {
	log.Info("create_payouts_job: starting")

	rewards, err := fetchEligibleRewards(ctx, pool)
	if err != nil {
		return fmt.Errorf("fetch eligible rewards: %w", err)
	}

	if len(rewards) == 0 {
		log.Info("create_payouts_job: no eligible rewards found")
		return nil
	}

	log.Info("create_payouts_job: found eligible rewards", "count", len(rewards))

	grouped := groupByPartner(rewards)

	created := 0
	skippedNoPix := 0
	skippedPending := 0

	for key, info := range grouped {
		if info.PixKey == "" {
			log.Warn("create_payouts_job: skipping partner without pix_key",
				"partner_id", key.PartnerID,
				"tenant_id", key.TenantID,
				"rewards_count", len(info.Rewards),
			)
			skippedNoPix++
			continue
		}

		hasPending, err := checkPendingPayout(ctx, pool, key.PartnerID, key.TenantID)
		if err != nil {
			log.Error("create_payouts_job: failed to check pending payout",
				"partner_id", key.PartnerID,
				"error", err,
			)
			continue
		}
		if hasPending {
			log.Info("create_payouts_job: skipping partner with existing pending payout",
				"partner_id", key.PartnerID,
				"tenant_id", key.TenantID,
			)
			skippedPending++
			continue
		}

		rewardIDs := make([]uuid.UUID, len(info.Rewards))
		for i, r := range info.Rewards {
			rewardIDs[i] = r.RewardID
		}

		payoutID, err := insertPayout(ctx, pool, key.TenantID, key.PartnerID, rewardIDs, info.TotalCents, info.PixKey, info.PixKeyType)
		if err != nil {
			log.Error("create_payouts_job: failed to insert payout",
				"partner_id", key.PartnerID,
				"error", err,
			)
			continue
		}

		log.Info("create_payouts_job: payout created",
			"payout_id", payoutID,
			"partner_id", key.PartnerID,
			"tenant_id", key.TenantID,
			"amount_cents", info.TotalCents,
			"rewards_count", len(info.Rewards),
		)
		created++
	}

	log.Info("create_payouts_job: completed",
		"created", created,
		"skipped_no_pix", skippedNoPix,
		"skipped_pending", skippedPending,
	)

	return nil
}

// fetchEligibleRewards queries for approved rewards whose hold period has expired.
func fetchEligibleRewards(ctx context.Context, pool *pgxpool.Pool) ([]EligibleReward, error) {
	rows, err := pool.Query(ctx, `
		SELECT r.id, r.partner_id, r.tenant_id, r.amount_cents,
		       pa.pix_key, pa.pix_key_type
		FROM rewards r
		JOIN partners pa ON pa.id = r.partner_id
		JOIN programs pr ON pr.id = pa.program_id
		WHERE r.status = 'approved'
		  AND r.approved_at + (COALESCE((pr.settings->>'hold_days')::int, $1) * INTERVAL '1 day') <= now()
		ORDER BY r.partner_id, r.tenant_id
	`, defaultHoldDays)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var rewards []EligibleReward
	for rows.Next() {
		var r EligibleReward
		if err := rows.Scan(&r.RewardID, &r.PartnerID, &r.TenantID, &r.AmountCents, &r.PixKey, &r.PixKeyType); err != nil {
			return nil, fmt.Errorf("scan reward: %w", err)
		}
		rewards = append(rewards, r)
	}
	return rewards, rows.Err()
}

// groupByPartner aggregates eligible rewards by partner+tenant.
func groupByPartner(rewards []EligibleReward) map[partnerKey]*partnerInfo {
	grouped := make(map[partnerKey]*partnerInfo)
	for _, r := range rewards {
		key := partnerKey{PartnerID: r.PartnerID, TenantID: r.TenantID}
		info, ok := grouped[key]
		if !ok {
			info = &partnerInfo{
				PixKey:     r.PixKey,
				PixKeyType: r.PixKeyType,
			}
			grouped[key] = info
		}
		info.Rewards = append(info.Rewards, r)
		info.TotalCents += r.AmountCents
	}
	return grouped
}

// checkPendingPayout returns true if the partner already has a pending payout.
func checkPendingPayout(ctx context.Context, pool *pgxpool.Pool, partnerID, tenantID uuid.UUID) (bool, error) {
	var exists bool
	err := pool.QueryRow(ctx,
		`SELECT EXISTS(
			SELECT 1 FROM payouts
			WHERE partner_id = $1 AND tenant_id = $2 AND status = 'pending'
		)`, partnerID, tenantID).Scan(&exists)
	return exists, err
}

// insertPayout creates a new payout record.
func insertPayout(ctx context.Context, pool *pgxpool.Pool, tenantID, partnerID uuid.UUID, rewardIDs []uuid.UUID, amountCents int64, pixKey, pixKeyType string) (uuid.UUID, error) {
	var payoutID uuid.UUID
	err := pool.QueryRow(ctx,
		`INSERT INTO payouts (tenant_id, partner_id, reward_ids, amount_cents, currency, method, status, pix_key, pix_key_type)
		 VALUES ($1, $2, $3, $4, 'BRL', 'pix', 'pending', $5, $6)
		 RETURNING id`,
		tenantID, partnerID, rewardIDs, amountCents, pixKey, pixKeyType,
	).Scan(&payoutID)
	if err != nil {
		return uuid.Nil, fmt.Errorf("insert payout: %w", err)
	}
	return payoutID, nil
}

// ScheduleCreatePayoutsJob runs RunCreatePayoutsJob on a daily schedule (3am UTC).
// It blocks until the context is cancelled.
func ScheduleCreatePayoutsJob(ctx context.Context, pool *pgxpool.Pool, log *slog.Logger) {
	log.Info("create_payouts_job: scheduled daily at 03:00 UTC")

	for {
		now := time.Now().UTC()
		next := time.Date(now.Year(), now.Month(), now.Day(), 3, 0, 0, 0, time.UTC)
		if !now.Before(next) {
			next = next.Add(24 * time.Hour)
		}
		delay := next.Sub(now)

		log.Info("create_payouts_job: next run", "at", next.Format(time.RFC3339), "in", delay)

		select {
		case <-ctx.Done():
			log.Info("create_payouts_job: scheduler stopped")
			return
		case <-time.After(delay):
			if err := RunCreatePayoutsJob(ctx, pool, log); err != nil {
				log.Error("create_payouts_job: run failed", "error", err)
			}
		}
	}
}
