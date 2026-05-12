-- name: CreateConsent :one
INSERT INTO consents (id, tenant_id, user_id, visitor_id, policy_name, policy_version, policy_url, ip_address, user_agent)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
RETURNING *;

-- name: GetActiveConsent :one
SELECT * FROM consents
WHERE tenant_id = $1
  AND policy_name = $2
  AND (user_id = $3 OR visitor_id = $4)
  AND revoked_at IS NULL
ORDER BY accepted_at DESC
LIMIT 1;

-- name: RevokeConsent :exec
UPDATE consents
SET revoked_at = now()
WHERE id = $1 AND revoked_at IS NULL;
