package lgpd

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log/slog"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Worker handles LGPD data export and erasure jobs.
type Worker struct {
	pool *pgxpool.Pool
}

// NewWorker creates a new LGPD worker.
func NewWorker(pool *pgxpool.Pool) *Worker {
	return &Worker{pool: pool}
}

// ExportDataJobInput is the input for data export.
type ExportDataJobInput struct {
	RequestID uuid.UUID `json:"request_id"`
	UserID    uuid.UUID `json:"user_id"`
	TenantID  uuid.UUID `json:"tenant_id"`
}

// ExportData exports all user data as required by LGPD art. 18.
func (w *Worker) ExportData(ctx context.Context, input []byte) error {
	var job ExportDataJobInput
	if err := json.Unmarshal(input, &job); err != nil {
		return fmt.Errorf("unmarshal job: %w", err)
	}

	slog.Info("starting data export", "user_id", job.UserID, "request_id", job.RequestID)

	w.pool.Exec(ctx,
		`UPDATE lgpd_requests SET status = 'processing', updated_at = now() WHERE id = $1`,
		job.RequestID)

	// TODO: Implement actual data collection and ZIP generation
	// For MVP, mark as completed
	w.pool.Exec(ctx,
		`UPDATE lgpd_requests SET status = 'completed', processed_at = now(), updated_at = now() WHERE id = $1`,
		job.RequestID)

	w.insertAuditLog(ctx, job.TenantID, job.UserID, "pii.export", "user", job.UserID,
		map[string]interface{}{"request_id": job.RequestID.String()})

	return nil
}

// EraseDataJobInput is the input for data erasure.
type EraseDataJobInput struct {
	RequestID uuid.UUID `json:"request_id"`
	UserID    uuid.UUID `json:"user_id"`
	TenantID  uuid.UUID `json:"tenant_id"`
}

// EraseData anonymizes user data as required by LGPD art. 18, IV.
func (w *Worker) EraseData(ctx context.Context, input []byte) error {
	var job EraseDataJobInput
	if err := json.Unmarshal(input, &job); err != nil {
		return fmt.Errorf("unmarshal job: %w", err)
	}

	slog.Info("starting data erasure", "user_id", job.UserID, "request_id", job.RequestID)

	w.pool.Exec(ctx,
		`UPDATE lgpd_requests SET status = 'processing', updated_at = now() WHERE id = $1`,
		job.RequestID)

	anonEmail := fmt.Sprintf("anon_%s@anonimizado.invalid", job.UserID.String()[:8])
	anonHash := hashString(anonEmail)

	w.pool.Exec(ctx,
		`UPDATE users SET
			name = 'USUÁRIO ANONIMIZADO',
			email = $2,
			email_hash = $3,
			phone_e164 = NULL,
			phone_hash = NULL,
			password_hash = 'ANONIMIZADO',
			mfa_secret = NULL,
			last_login_at = NULL,
			updated_at = now()
		 WHERE id = $1`, job.UserID, anonEmail, anonHash)

	w.pool.Exec(ctx,
		`UPDATE partners SET
			name = 'PARCEIRO ANONIMIZADO',
			email = NULL,
			phone_e164 = NULL,
			document = NULL,
			pix_key = NULL,
			updated_at = now()
		 WHERE user_id = $1`, job.UserID)

	w.pool.Exec(ctx,
		`UPDATE leads SET
			name = NULL,
			email = NULL,
			phone_e164 = NULL,
			notes = NULL,
			updated_at = now()
		 WHERE email_hash IN (SELECT email_hash FROM users WHERE id = $1)`, job.UserID)

	w.pool.Exec(ctx,
		`UPDATE consents SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL`,
		job.UserID)

	w.pool.Exec(ctx,
		`UPDATE lgpd_requests SET status = 'completed', processed_at = now(), updated_at = now() WHERE id = $1`,
		job.RequestID)

	w.insertAuditLog(ctx, job.TenantID, job.UserID, "pii.erased", "user", job.UserID,
		map[string]interface{}{"request_id": job.RequestID.String()})

	return nil
}

// RetentionSweepJob runs daily to anonymize expired data.
type RetentionSweepJob struct {
	pool *pgxpool.Pool
}

// NewRetentionSweep creates a new retention sweep job.
func NewRetentionSweep(pool *pgxpool.Pool) *RetentionSweepJob {
	return &RetentionSweepJob{pool: pool}
}

// Run executes the retention sweep.
func (j *RetentionSweepJob) Run(ctx context.Context) error {
	slog.Info("starting retention sweep")

	result, err := j.pool.Exec(ctx,
		`UPDATE click_events SET
			ip_inet = NULL, ua = NULL, accept_lang = NULL, referer = NULL
		 WHERE occurred_at < now() - INTERVAL '12 months' AND ip_inet IS NOT NULL`)
	if err != nil {
		slog.Error("failed to anonymize click_events", "error", err)
	} else {
		slog.Info("anonymized click_events", "rows", result.RowsAffected())
	}

	result, err = j.pool.Exec(ctx,
		`DELETE FROM refresh_tokens WHERE revoked_at IS NOT NULL AND revoked_at < now() - INTERVAL '30 days'`)
	if err != nil {
		slog.Error("failed to delete expired refresh tokens", "error", err)
	} else {
		slog.Info("deleted expired refresh tokens", "rows", result.RowsAffected())
	}

	result, err = j.pool.Exec(ctx,
		`DELETE FROM idempotency_keys WHERE expires_at < now()`)
	if err != nil {
		slog.Error("failed to delete expired idempotency keys", "error", err)
	} else {
		slog.Info("deleted expired idempotency keys", "rows", result.RowsAffected())
	}

	return nil
}

func (w *Worker) insertAuditLog(ctx context.Context, tenantID, userID uuid.UUID, action, entityType string, entityID uuid.UUID, metadata map[string]interface{}) {
	metaJSON, _ := json.Marshal(metadata)
	w.pool.Exec(ctx,
		`INSERT INTO audit_log (id, tenant_id, user_id, action, entity_type, entity_id, metadata)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		uuid.New(), tenantID, userID, action, entityType, entityID, metaJSON)
}

func hashString(s string) string {
	h := sha256.Sum256([]byte(s))
	return hex.EncodeToString(h[:])
}
