-- name: CreateProgram :one
INSERT INTO programs (id, tenant_id, name, description, rules, redirect_type, redirect_url, whatsapp_number)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING *;

-- name: GetProgram :one
SELECT * FROM programs
WHERE id = $1;

-- name: ListProgramsByTenant :many
SELECT * FROM programs
WHERE tenant_id = $1
ORDER BY created_at DESC;

-- name: UpdateProgramRules :one
UPDATE programs
SET rules = $2, updated_at = now()
WHERE id = $1
RETURNING *;

-- name: UpdateProgramStatus :one
UPDATE programs
SET status = $2, updated_at = now()
WHERE id = $1
RETURNING *;
