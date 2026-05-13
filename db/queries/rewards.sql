-- name: CreateReward :one
INSERT INTO rewards (id, tenant_id, program_id, referral_id, partner_id, sale_id, type, amount_cents, currency, status, metadata)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
RETURNING *;

-- name: GetReward :one
SELECT * FROM rewards
WHERE id = $1;

-- name: ListRewardsByPartner :many
SELECT * FROM rewards
WHERE partner_id = $1
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;

-- name: ApproveReward :one
UPDATE rewards
SET status = 'approved', approved_at = now(), approved_by = $2, updated_at = now()
WHERE id = $1 AND status = 'pending'
RETURNING *;

-- name: RejectReward :one
UPDATE rewards
SET status = 'rejected', rejected_reason = $2, updated_at = now()
WHERE id = $1 AND status = 'pending'
RETURNING *;

-- name: ListPendingRewards :many
SELECT * FROM rewards
WHERE tenant_id = $1 AND status = 'pending'
ORDER BY created_at ASC
LIMIT $2 OFFSET $3;

-- name: ListApprovedRewardsForPayout :many
SELECT r.id, r.partner_id, r.amount_cents, r.approved_at, r.program_id
FROM rewards r
JOIN partners pa ON pa.id = r.partner_id AND pa.tenant_id = r.tenant_id
JOIN programs p ON p.id = r.program_id
WHERE r.tenant_id = $1
  AND r.status = 'approved'
  AND pa.pix_key IS NOT NULL
  AND pa.pix_key != ''
  AND r.approved_at + COALESCE((p.settings->>'hold_days')::int, 7) * INTERVAL '1 day' <= now()
ORDER BY r.partner_id, r.approved_at ASC;

-- name: GetProgramMinPayoutCents :one
SELECT COALESCE((settings->>'payout_min_cents')::bigint, 5000) AS min_cents
FROM programs
WHERE id = $1;
