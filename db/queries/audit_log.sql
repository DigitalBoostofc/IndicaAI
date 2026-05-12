-- name: InsertAuditLog :exec
INSERT INTO audit_log (id, tenant_id, user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent, metadata)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11);

-- name: ListAuditLogByEntity :many
SELECT * FROM audit_log
WHERE tenant_id = $1 AND entity_type = $2 AND entity_id = $3
ORDER BY created_at DESC
LIMIT $4 OFFSET $5;

-- name: ListAuditLogByUser :many
SELECT * FROM audit_log
WHERE user_id = $1
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;
