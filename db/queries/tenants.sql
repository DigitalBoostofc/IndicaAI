-- name: CreateTenant :one
INSERT INTO tenants (id, name, subdomain, plan, settings)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: GetTenantBySubdomain :one
SELECT * FROM tenants
WHERE lower(subdomain) = lower($1)
LIMIT 1;

-- name: GetTenantByID :one
SELECT * FROM tenants
WHERE id = $1;

-- name: UpdateTenantSettings :one
UPDATE tenants
SET settings = $2, updated_at = now()
WHERE id = $1
RETURNING *;
