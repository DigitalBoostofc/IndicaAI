package payouts

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/indica-ai/indica-ai/internal/platform/pix"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Worker handles payout processing.
type Worker struct {
	pool      *pgxpool.Pool
	pixClient pix.Client
}

// NewWorker creates a new payouts worker.
func NewWorker(pool *pgxpool.Pool, pixClient pix.Client) *Worker {
	return &Worker{pool: pool, pixClient: pixClient}
}

// PayoutPixJobInput is the input for Pix payout processing.
type PayoutPixJobInput struct {
	PayoutID uuid.UUID `json:"payout_id"`
}

// ProcessPayout processes a Pix payout.
func (w *Worker) ProcessPayout(ctx context.Context, input []byte) error {
	var job PayoutPixJobInput
	if err := json.Unmarshal(input, &job); err != nil {
		return fmt.Errorf("unmarshal job: %w", err)
	}

	// Get payout with FOR UPDATE to prevent concurrent processing
	var amountCents int64
	var pixKey, pixKeyType, method string
	var attempts int
	err := w.pool.QueryRow(ctx,
		`SELECT amount_cents, pix_key, pix_key_type, method, attempts
		 FROM payouts WHERE id = $1 AND status IN ('pending', 'processing')
		 FOR UPDATE`, job.PayoutID).Scan(
		&amountCents, &pixKey, &pixKeyType, &method, &attempts)
	if err != nil {
		return fmt.Errorf("get payout: %w", err)
	}

	// Mark as processing
	w.pool.Exec(ctx,
		`UPDATE payouts SET status = 'processing', attempts = attempts + 1, updated_at = now()
		 WHERE id = $1`, job.PayoutID)

	// Process based on method
	switch method {
	case "pix":
		externalID, err := w.pixClient.CreateTransfer(amountCents, pixKey, pixKeyType, "Comissão Indica AÍ!")
		if err != nil {
			// Calculate next retry with exponential backoff
			nextRetry := w.calculateNextRetry(attempts)
			w.pool.Exec(ctx,
				`UPDATE payouts SET status = 'failed', failed_at = now(), failure_reason = $2,
				 next_retry_at = $3, updated_at = now() WHERE id = $1`,
				job.PayoutID, err.Error(), nextRetry)
			return fmt.Errorf("pix transfer failed: %w", err)
		}

		// Mark as paid
		w.pool.Exec(ctx,
			`UPDATE payouts SET status = 'paid', paid_at = now(), external_id = $2, updated_at = now()
			 WHERE id = $1`, job.PayoutID, externalID)

		// Update associated rewards to paid
		w.pool.Exec(ctx,
			`UPDATE rewards SET status = 'paid', updated_at = now()
			 WHERE id = ANY(SELECT unnest(reward_ids) FROM payouts WHERE id = $1)`, job.PayoutID)

	default:
		// Manual payout — just mark as pending
		w.pool.Exec(ctx,
			`UPDATE payouts SET status = 'pending', updated_at = now() WHERE id = $1`, job.PayoutID)
	}

	w.insertAuditLog(ctx, job.PayoutID, "payout.confirmed")

	return nil
}

// calculateNextRetry returns the next retry time with exponential backoff.
// Backoff: 1m, 5m, 30m, 2h, 12h, 24h
func (w *Worker) calculateNextRetry(attempts int) time.Time {
	backoffs := []time.Duration{
		1 * time.Minute,
		5 * time.Minute,
		30 * time.Minute,
		2 * time.Hour,
		12 * time.Hour,
		24 * time.Hour,
	}
	idx := attempts
	if idx >= len(backoffs) {
		idx = len(backoffs) - 1
	}
	return time.Now().Add(backoffs[idx])
}

func (w *Worker) insertAuditLog(ctx context.Context, payoutID uuid.UUID, action string) {
	w.pool.Exec(ctx,
		`INSERT INTO audit_log (id, tenant_id, action, entity_type, entity_id, metadata)
		 SELECT uuid_generate_v4(), tenant_id, $2, 'payout', id, '{}'::jsonb
		 FROM payouts WHERE id = $1`, payoutID, action)
}
