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

-- name: ListPayoutsByTenant :many
SELECT p.id, p.tenant_id, p.partner_id, p.reward_ids, p.amount_cents, p.currency,
       p.method, p.status, p.pix_key, p.pix_key_type, p.paid_at, p.metadata,
       p.created_at, p.updated_at,
       pt.name AS partner_name
FROM payouts p
JOIN partners pt ON pt.id = p.partner_id AND pt.tenant_id = p.tenant_id
WHERE p.tenant_id = $1
  AND ($2::text = '' OR p.status = $2)
ORDER BY p.created_at DESC
LIMIT $3 OFFSET $4;

-- name: CountPayoutsByTenant :one
SELECT COUNT(*) FROM payouts p
WHERE p.tenant_id = $1
  AND ($2::text = '' OR p.status = $2);

-- name: ConfirmPayout :one
UPDATE payouts
SET status = 'processing', updated_at = now()
WHERE id = $1 AND status = 'pending'
RETURNING *;

-- name: MarkPayoutPaidManual :one
UPDATE payouts
SET status = 'paid', paid_at = COALESCE($2, now()), metadata = metadata || $3::jsonb, updated_at = now()
WHERE id = $1 AND status = 'processing'
RETURNING *;

-- name: CancelPayout :one
UPDATE payouts
SET status = 'cancelled', failure_reason = $2, updated_at = now()
WHERE id = $1 AND status IN ('pending', 'processing')
RETURNING *;

-- name: GetPayoutWithPartner :one
SELECT p.id, p.tenant_id, p.partner_id, p.reward_ids, p.amount_cents, p.currency,
       p.method, p.status, p.pix_key, p.pix_key_type, p.paid_at, p.metadata,
       p.created_at, p.updated_at,
       pt.name AS partner_name
FROM payouts p
JOIN partners pt ON pt.id = p.partner_id AND pt.tenant_id = p.tenant_id
WHERE p.id = $1 AND p.tenant_id = $2;

-- name: ListPayoutsByPartner :many
SELECT p.id, p.tenant_id, p.partner_id, p.reward_ids, p.amount_cents, p.currency,
       p.method, p.status, p.pix_key, p.pix_key_type, p.paid_at, p.metadata,
       p.created_at, p.updated_at
FROM payouts p
WHERE p.partner_id = $1 AND p.tenant_id = $2
ORDER BY p.created_at DESC
LIMIT $3 OFFSET $4;

-- name: CountPayoutsByPartner :one
SELECT COUNT(*) FROM payouts
WHERE partner_id = $1 AND tenant_id = $2;

-- name: UpdateRewardsStatusByIDs :exec
UPDATE rewards
SET status = $3, updated_at = now()
WHERE id = ANY($1::uuid[]) AND tenant_id = $2;

-- name: CheckPendingPayoutForPartner :one
SELECT EXISTS(
    SELECT 1 FROM payouts
    WHERE partner_id = $1 AND tenant_id = $2 AND status = 'pending'
) AS exists;

-- name: GetWalletSummary :one
SELECT
    COALESCE(SUM(r.amount_cents), 0)
        FILTER (WHERE r.status = 'approved'
                  AND r.approved_at + COALESCE((p_prog.settings->>'hold_days')::int, 7) * INTERVAL '1 day' <= now())
      - COALESCE(SUM(py.amount_cents), 0)
        FILTER (WHERE py.status IN ('pending', 'processing', 'paid'))
    AS available_cents,
    COALESCE(SUM(r.amount_cents), 0)
        FILTER (WHERE r.status = 'approved'
                  AND r.approved_at + COALESCE((p_prog.settings->>'hold_days')::int, 7) * INTERVAL '1 day' > now())
    AS hold_cents,
    COALESCE(SUM(r.amount_cents), 0)
        FILTER (WHERE r.status = 'pending')
    AS pending_cents,
    COALESCE(SUM(py.amount_cents), 0)
        FILTER (WHERE py.status = 'paid')
    AS total_paid_cents
FROM partners pa
JOIN programs p_prog ON p_prog.id = pa.program_id
LEFT JOIN rewards r ON r.partner_id = pa.id AND r.tenant_id = pa.tenant_id
LEFT JOIN payouts py ON py.partner_id = pa.id AND py.tenant_id = pa.tenant_id
WHERE pa.id = $1 AND pa.tenant_id = $2
GROUP BY pa.id;
