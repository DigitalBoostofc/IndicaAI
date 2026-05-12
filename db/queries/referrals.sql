-- name: CreateReferral :one
INSERT INTO referrals (id, tenant_id, program_id, partner_id, partner_link_id, rule_snapshot, split_choice, attribution_model, attribution_score, attributed_at)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
RETURNING *;

-- name: GetReferralWithRuleSnapshot :one
-- FOR UPDATE: locks the row for reward calculation to prevent race conditions.
SELECT * FROM referrals
WHERE id = $1
FOR UPDATE;

-- name: ListReferralsByPartner :many
SELECT r.*, l.status AS lead_status, l.name AS lead_name
FROM referrals r
LEFT JOIN leads l ON l.referral_id = r.id
WHERE r.partner_id = $1
ORDER BY r.created_at DESC
LIMIT $2 OFFSET $3;

-- name: ListReferralsByProgram :many
SELECT r.*, l.status AS lead_status
FROM referrals r
LEFT JOIN leads l ON l.referral_id = r.id
WHERE r.program_id = $1
ORDER BY r.created_at DESC
LIMIT $2 OFFSET $3;
