-- name: InsertClickEvent :one
INSERT INTO click_events (id, tenant_id, program_id, partner_id, slug, visitor_id, fingerprint, ip_inet, ua, accept_lang, referer, utm, occurred_at)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
RETURNING *;

-- name: FindAttributionCandidates :many
-- Finds click events that could attribute a conversion.
-- Searches by visitor_id OR fingerprint within the attribution window.
-- Returns the most recent first (last-touch model).
SELECT ce.*
FROM click_events ce
WHERE ce.tenant_id = $1
  AND ce.program_id = $2
  AND (
      ce.visitor_id = $3                        -- match by visitor_id (cookie)
      OR ce.fingerprint = $4                    -- match by fingerprint (fallback)
  )
  AND ce.occurred_at >= $5                      -- attribution window start
  AND ce.occurred_at <= $6                      -- attribution window end
ORDER BY ce.occurred_at DESC
LIMIT 10;

-- name: CountClicksByPartner :one
SELECT COUNT(*) AS total,
       COUNT(DISTINCT visitor_id) AS unique_visitors
FROM click_events
WHERE partner_id = $1
  AND occurred_at >= $2;
