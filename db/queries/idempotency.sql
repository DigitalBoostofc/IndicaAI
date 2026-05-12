-- name: GetIdempotencyKey :one
SELECT * FROM idempotency_keys
WHERE key = $1 AND tenant_id = $2 AND expires_at > now();

-- name: CreateIdempotencyKey :one
INSERT INTO idempotency_keys (key, tenant_id, request_hash, response_body, status_code, expires_at)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: DeleteExpiredIdempotencyKeys :exec
DELETE FROM idempotency_keys
WHERE expires_at < now();
