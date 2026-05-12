-- name: CreateSale :one
INSERT INTO sales (id, tenant_id, program_id, lead_id, referral_id, partner_id, amount_cents, currency, external_id, status, metadata)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
RETURNING *;

-- name: ConfirmSale :one
UPDATE sales
SET status = 'confirmed', confirmed_at = now(), updated_at = now()
WHERE id = $1
RETURNING *;

-- name: GetSale :one
SELECT * FROM sales
WHERE id = $1;

-- name: ListSalesByPartner :many
SELECT * FROM sales
WHERE partner_id = $1
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;
