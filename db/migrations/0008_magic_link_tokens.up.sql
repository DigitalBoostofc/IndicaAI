CREATE TABLE magic_link_tokens (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    token_hash  text NOT NULL UNIQUE,
    user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    partner_id  uuid REFERENCES partners(id) ON DELETE CASCADE,
    tenant_id   uuid REFERENCES tenants(id) ON DELETE CASCADE,
    expires_at  timestamptz NOT NULL,
    used_at     timestamptz,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX magic_link_tokens_user_idx ON magic_link_tokens(user_id);
CREATE INDEX magic_link_tokens_unused_idx ON magic_link_tokens(expires_at) WHERE used_at IS NULL;

COMMENT ON TABLE magic_link_tokens IS 'One-time passwordless auth tokens. token_hash = sha256 of raw token; raw token sent via email/dev-mode response.';
