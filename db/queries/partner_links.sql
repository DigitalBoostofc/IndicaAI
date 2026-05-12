-- name: CreatePartnerLinkWithSlug :one
INSERT INTO partner_links (id, tenant_id, program_id, partner_id, slug, url)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: GetPartnerLinkBySlug :one
SELECT pl.*, p.name AS partner_name, p.tenant_id AS partner_tenant_id
FROM partner_links pl
JOIN partners p ON p.id = pl.partner_id
WHERE pl.slug = $1 AND pl.is_active = true;

-- name: ListPartnerLinksByPartner :many
SELECT * FROM partner_links
WHERE partner_id = $1
ORDER BY created_at DESC;

-- name: IncrementClickCount :exec
UPDATE partner_links
SET click_count = click_count + 1
WHERE id = $1;
