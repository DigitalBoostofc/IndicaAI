-- name: InsertLeadWithDedup :one
-- Inserts a lead with deduplication by (program_id, phone_hash).
-- If the lead already exists, returns the existing one (ON CONFLICT DO NOTHING + RETURNING).
INSERT INTO leads (id, tenant_id, program_id, referral_id, name, email, email_hash, phone_e164, phone_hash, source, notes, metadata)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
ON CONFLICT (program_id, phone_hash) DO NOTHING
RETURNING *;

-- name: GetLead :one
SELECT * FROM leads
WHERE id = $1;

-- name: GetLeadByPhoneHash :one
SELECT * FROM leads
WHERE program_id = $1 AND phone_hash = $2;

-- name: UpdateLeadStatus :one
UPDATE leads
SET status = $2,
    closed_at = CASE WHEN $2::lead_status = 'closed' THEN now() ELSE closed_at END,
    updated_at = now()
WHERE id = $1
RETURNING *;

-- name: ListLeadsByStatus :many
SELECT * FROM leads
WHERE tenant_id = $1 AND status = $2
ORDER BY created_at DESC
LIMIT $3 OFFSET $4;

-- name: ListLeadsByProgram :many
SELECT * FROM leads
WHERE program_id = $1
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;
