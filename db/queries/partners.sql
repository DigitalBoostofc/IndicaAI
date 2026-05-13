-- name: CreatePartner :one
INSERT INTO partners (id, tenant_id, program_id, user_id, name, email, email_hash, phone_e164, phone_hash, document, document_hash, pix_key, pix_key_type, default_split)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
RETURNING *;

-- name: GetPartner :one
SELECT * FROM partners
WHERE id = $1;

-- name: ListPartnersByProgram :many
SELECT * FROM partners
WHERE program_id = $1
ORDER BY created_at DESC;

-- name: UpdatePartnerPixKey :one
UPDATE partners
SET pix_key = $2, pix_key_type = $3, updated_at = now()
WHERE id = $1
RETURNING *;

-- name: UpdatePartnerStatus :one
UPDATE partners
SET status = $2, updated_at = now()
WHERE id = $1
RETURNING *;

-- name: GetPartnerByUserAndTenant :one
SELECT * FROM partners
WHERE user_id = $1 AND tenant_id = $2
LIMIT 1;
