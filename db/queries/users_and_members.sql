-- name: CreateUser :one
INSERT INTO users (id, email, email_hash, name, phone_e164, phone_hash, password_hash, role)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING *;

-- name: GetUserByEmailHash :one
SELECT * FROM users
WHERE email_hash = $1;

-- name: GetUserByID :one
SELECT * FROM users
WHERE id = $1;

-- name: AddTenantMember :one
INSERT INTO tenant_members (id, tenant_id, user_id, role)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: ListTenantMembers :many
SELECT tm.*, u.name, u.email
FROM tenant_members tm
JOIN users u ON u.id = tm.user_id
WHERE tm.tenant_id = $1
ORDER BY tm.created_at;

-- name: GetTenantMemberByUser :one
SELECT tm.*, u.name, u.email
FROM tenant_members tm
JOIN users u ON u.id = tm.user_id
WHERE tm.tenant_id = $1 AND tm.user_id = $2;
