-- name: CreatePayout :one
INSERT INTO payouts (id, tenant_id, partner_id, reward_ids, amount_cents, currency, method, status, pix_key, pix_key_type, metadata)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
RETURNING *;

-- name: GetPayout :one
SELECT * FROM payouts
WHERE id = $1;

-- name: ListPendingPayouts :many
SELECT p.*, pt.name AS partner_name, pt.pix_key AS partner_pix_key
FROM payouts p
JOIN partners pt ON pt.id = p.partner_id
WHERE p.tenant_id = $1 AND p.status = 'pending'
ORDER BY p.created_at ASC
LIMIT $2 OFFSET $3;

-- name: MarkPayoutPaid :one
UPDATE payouts
SET status = 'paid', paid_at = now(), external_id = $2, updated_at = now()
WHERE id = $1 AND status IN ('pending', 'processing')
RETURNING *;

-- name: MarkPayoutFailed :one
UPDATE payouts
SET status = 'failed', failed_at = now(), failure_reason = $2, attempts = attempts + 1,
    next_retry_at = $3, updated_at = now()
WHERE id = $1
RETURNING *;

-- name: ListFailedPayoutsForRetry :many
SELECT * FROM payouts
WHERE status = 'failed'
  AND next_retry_at <= now()
  AND attempts < 6
ORDER BY next_retry_at ASC
LIMIT $1;
