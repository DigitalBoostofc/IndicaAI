-- 0009_api_keys
-- API key authentication for external integrations

BEGIN;

CREATE TABLE api_keys (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id    uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name         text NOT NULL,
    key_prefix   text NOT NULL,           -- 8 chars from the start for identification
    key_hash     text NOT NULL,           -- argon2id of the full raw key
    last_used_at timestamptz,
    expires_at   timestamptz,
    revoked_at   timestamptz,
    created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX api_keys_prefix_idx ON api_keys(key_prefix) WHERE revoked_at IS NULL;
CREATE INDEX api_keys_tenant_idx ON api_keys(tenant_id);

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys FORCE ROW LEVEL SECURITY;

CREATE POLICY api_keys_tenant_isolation ON api_keys
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

COMMENT ON TABLE api_keys IS 'API keys for external integrations. Key is stored as Argon2id hash.';
COMMENT ON COLUMN api_keys.key_prefix IS 'First 8 chars of the key for fast lookup (non-secret).';
COMMENT ON COLUMN api_keys.key_hash IS 'Argon2id hash of the full raw key. Never store the raw key.';

COMMIT;
