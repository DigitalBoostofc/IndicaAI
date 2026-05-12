-- 0001_tenants_and_identity
-- Multi-tenant foundation: tenants, users, tenant_members, sessions, refresh_tokens, api_keys

BEGIN;

-- =============================================================================
-- tenants (plataforma — sem tenant_id, cada row É um tenant)
-- =============================================================================
CREATE TABLE tenants (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name            text NOT NULL,
    subdomain       text NOT NULL,
    logo_url        text,
    plan            text NOT NULL DEFAULT 'free',
    status          text NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'suspended', 'cancelled')),
    settings        jsonb NOT NULL DEFAULT '{}',
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX tenants_subdomain_idx ON tenants (lower(subdomain));

COMMENT ON TABLE tenants IS 'Cada empresa cliente é um tenant. Não tem RLS — é gerenciado pelo SaaS owner.';
COMMENT ON COLUMN tenants.settings IS 'Configurações globais do tenant (timezone, locale, webhook_url, etc).';


-- =============================================================================
-- users (global — pode pertencer a N tenants via tenant_members)
-- =============================================================================
CREATE TABLE users (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email           text NOT NULL,
    email_hash      text NOT NULL,                    -- sha256(lower(email)) para dedup sem expor PII
    email_verified  boolean NOT NULL DEFAULT false,
    password_hash   text,                             -- null para magic-link users
    name            text NOT NULL,
    phone_e164      text,                             -- PII; retention=5y
    phone_hash      text,                             -- sha256(phone_e164) para lookup sem expor PII
    avatar_url      text,
    role            text NOT NULL DEFAULT 'user'
                    CHECK (role IN ('user', 'saas_admin')),
    mfa_secret      text,                             -- TOTP secret (encrypted at app layer)
    mfa_enabled     boolean NOT NULL DEFAULT false,
    last_login_at   timestamptz,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX users_email_hash_idx ON users (email_hash);
CREATE INDEX users_phone_hash_idx ON users (phone_hash) WHERE phone_hash IS NOT NULL;

COMMENT ON TABLE users IS 'Usuários globais. Sem RLS — um user pode ter acesso a N tenants. Admin da plataforma usa role=saas_admin.';
COMMENT ON COLUMN users.email IS 'PII; retention=5y';
COMMENT ON COLUMN users.phone_e164 IS 'PII; retention=5y';
COMMENT ON COLUMN users.password_hash IS 'Argon2id hash. Null para magic-link-only users.';
COMMENT ON COLUMN users.mfa_secret IS 'Encrypted TOTP secret. App-layer encryption required.';


-- =============================================================================
-- tenant_members (ponte N:N users ↔ tenants)
-- =============================================================================
CREATE TABLE tenant_members (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role            text NOT NULL DEFAULT 'member'
                    CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
    invited_at      timestamptz NOT NULL DEFAULT now(),
    joined_at       timestamptz,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, user_id)
);

CREATE INDEX tenant_members_user_idx ON tenant_members(user_id);

COMMENT ON TABLE tenant_members IS 'Relação N:N entre users e tenants. Define papel do usuário dentro de cada empresa.';


-- =============================================================================
-- sessions (sessões ativas — para revogação e auditoria)
-- =============================================================================
CREATE TABLE sessions (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id       uuid REFERENCES tenants(id) ON DELETE CASCADE,  -- null = sessão global (saas_admin)
    ip_address      inet,
    user_agent      text,
    created_at      timestamptz NOT NULL DEFAULT now(),
    expires_at      timestamptz NOT NULL,
    revoked_at      timestamptz
);

CREATE INDEX sessions_user_idx ON sessions(user_id) WHERE revoked_at IS NULL;
CREATE INDEX sessions_expires_idx ON sessions(expires_at) WHERE revoked_at IS NULL;

COMMENT ON TABLE sessions IS 'Sessões ativas para revogação e auditoria. Não confundir com refresh_tokens.';


-- =============================================================================
-- refresh_tokens (JWT refresh rotation com family_id para theft detection)
-- =============================================================================
CREATE TABLE refresh_tokens (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id      uuid REFERENCES sessions(id) ON DELETE CASCADE,
    tenant_id       uuid REFERENCES tenants(id) ON DELETE CASCADE,
    family_id       uuid NOT NULL,                    -- agrupa rotação — mesmo family = mesmo login
    token_hash      text NOT NULL,                    -- sha256 do token (nunca armazenar token puro)
    jti             text NOT NULL,                    -- JWT ID para matching
    expires_at      timestamptz NOT NULL,
    revoked_at      timestamptz,
    replaced_by     uuid REFERENCES refresh_tokens(id),
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX refresh_tokens_token_hash_idx ON refresh_tokens(token_hash);
CREATE INDEX refresh_tokens_family_idx ON refresh_tokens(family_id) WHERE revoked_at IS NULL;
CREATE INDEX refresh_tokens_user_idx ON refresh_tokens(user_id) WHERE revoked_at IS NULL;

COMMENT ON TABLE refresh_tokens IS 'Refresh tokens rotativos. Family ID permite detectar token theft (uso de token já rotacionado).';
COMMENT ON COLUMN refresh_tokens.token_hash IS 'sha256 do refresh token. Nunca armazenar token puro.';


-- =============================================================================
-- api_keys (chaves de API para integração de clientes)
-- =============================================================================
CREATE TABLE api_keys (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name            text NOT NULL,
    key_hash        text NOT NULL,                    -- Argon2id hash da chave
    key_prefix      text NOT NULL,                    -- primeiros 8 chars para identificação no UI
    scopes          text[] NOT NULL DEFAULT '{}',     -- ex: {'leads:write', 'webhooks:read'}
    last_used_at    timestamptz,
    expires_at      timestamptz,
    revoked_at      timestamptz,
    created_at      timestamptz NOT NULL DEFAULT now(),
    created_by      uuid REFERENCES users(id)
);

CREATE UNIQUE INDEX api_keys_key_hash_idx ON api_keys(key_hash);
CREATE INDEX api_keys_tenant_idx ON api_keys(tenant_id) WHERE revoked_at IS NULL;

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys FORCE ROW LEVEL SECURITY;

CREATE POLICY api_keys_tenant_isolation ON api_keys
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

COMMENT ON TABLE api_keys IS 'Chaves de API para integração dos clientes. Key armazenada como Argon2id.';
COMMENT ON COLUMN api_keys.key_hash IS 'Argon2id hash da API key. Prefix (8 chars) armazenado separadamente para UI.';


-- =============================================================================
-- updated_at trigger helper
-- =============================================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tenants_updated_at BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER tenant_members_updated_at BEFORE UPDATE ON tenant_members FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
