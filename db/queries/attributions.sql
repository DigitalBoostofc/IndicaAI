-- name: CreateAttribution :one
INSERT INTO attributions (id, tenant_id, referral_id, partner_id, click_id, model, score, matched_by, reason)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
RETURNING *;

-- name: GetAttributionByReferral :one
SELECT * FROM attributions
WHERE referral_id = $1
ORDER BY score DESC
LIMIT 1;

-- name: ListAttributionsByPartner :many
SELECT * FROM attributions
WHERE partner_id = $1
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;
