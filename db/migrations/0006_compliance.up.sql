-- 0006_compliance
-- Consents (LGPD), audit_log (append-only), lgpd_requests

BEGIN;

-- =============================================================================
-- consents (registro de consentimento LGPD)
-- =============================================================================
CREATE TABLE consents (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       uuid REFERENCES tenants(id) ON DELETE CASCADE,  -- null = consentimento global da plataforma
    user_id         uuid REFERENCES users(id) ON DELETE SET NULL,    -- null = consentimento de visitante não-logado
    visitor_id      uuid,                             -- identificador de visitante não-logado
    policy_name     text NOT NULL,                    -- ex: 'privacy_policy', 'terms_of_service', 'cookie_policy'
    policy_version  text NOT NULL,                    -- versão do documento aceito
    policy_url      text,                             -- URL do documento aceito
    accepted_at     timestamptz NOT NULL DEFAULT now(),
    ip_address      inet,                             -- PII; retention=5y
    user_agent      text,
    revoked_at      timestamptz,                      -- se o usuário revogou
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX consents_tenant_user_idx ON consents(tenant_id, user_id) WHERE user_id IS NOT NULL;
CREATE INDEX consents_tenant_visitor_idx ON consents(tenant_id, visitor_id) WHERE visitor_id IS NOT NULL;
CREATE INDEX consents_policy_idx ON consents(policy_name, policy_version);

ALTER TABLE consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE consents FORCE ROW LEVEL SECURITY;

CREATE POLICY consents_tenant_isolation ON consents
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

COMMENT ON TABLE consents IS 'Registro de consentimentos LGPD. Append-only — nunca deletar, apenas marcar revoked_at.';
COMMENT ON COLUMN consents.ip_address IS 'IP do consentimento. PII; retention=5y';


-- =============================================================================
-- audit_log (append-only — logs de auditoria imutáveis)
-- =============================================================================
CREATE TABLE audit_log (
    id              uuid NOT NULL DEFAULT gen_random_uuid(),
    tenant_id       uuid NOT NULL,
    user_id         uuid,                             -- null = ação do sistema
    action          text NOT NULL,                    -- ex: 'lead.created', 'payout.approved', 'user.login', 'data.exported'
    entity_type     text NOT NULL,                    -- ex: 'lead', 'payout', 'user', 'partner'
    entity_id       uuid,
    old_values      jsonb,                            -- valores antes da mudança (para updates)
    new_values      jsonb,                            -- valores depois da mudança
    ip_address      inet,                             -- PII; retention=5y
    user_agent      text,
    metadata        jsonb NOT NULL DEFAULT '{}',
    created_at      timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (id, created_at)                      -- PK composta para particionamento futuro
);

CREATE INDEX audit_log_tenant_created_idx ON audit_log(tenant_id, created_at DESC);
CREATE INDEX audit_log_entity_idx ON audit_log(tenant_id, entity_type, entity_id, created_at DESC);
CREATE INDEX audit_log_user_idx ON audit_log(user_id, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX audit_log_action_idx ON audit_log(tenant_id, action, created_at DESC);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log FORCE ROW LEVEL SECURITY;

CREATE POLICY audit_log_tenant_isolation ON audit_log
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

-- Sem UPDATE/DELETE — append-only por design. App layer deve usar INSERT apenas.
-- Para enforcement estrito, poderia criar role sem UPDATE/DELETE, mas no MVP confiamos no app layer.

COMMENT ON TABLE audit_log IS 'Log de auditoria append-only. Nunca deletar ou atualizar. Particionar por created_at quando volume crescer.';
COMMENT ON COLUMN audit_log.ip_address IS 'IP de quem fez a ação. PII; retention=5y.';
COMMENT ON COLUMN audit_log.old_values IS 'Snapshot do estado anterior (updates). Null para creates.';


-- =============================================================================
-- lgpd_requests (solicitações de exportação e anonimização)
-- =============================================================================
CREATE TYPE lgpd_request_type AS ENUM ('export', 'erase', 'rectify', 'access');
CREATE TYPE lgpd_request_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled');

CREATE TABLE lgpd_requests (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       uuid REFERENCES tenants(id) ON DELETE CASCADE,  -- null = request global
    user_id         uuid REFERENCES users(id) ON DELETE SET NULL,
    request_type    lgpd_request_type NOT NULL,
    status          lgpd_request_status NOT NULL DEFAULT 'pending',
    requested_at    timestamptz NOT NULL DEFAULT now(),
    processed_at    timestamptz,
    processed_by    uuid REFERENCES users(id),        -- admin que processou
    download_url    text,                             -- URL assinada no R2 (expira em 7 dias)
    download_expires_at timestamptz,
    failure_reason  text,
    metadata        jsonb NOT NULL DEFAULT '{}',       -- detalhes da solicitação
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX lgpd_requests_tenant_status_idx ON lgpd_requests(tenant_id, status);
CREATE INDEX lgpd_requests_user_idx ON lgpd_requests(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX lgpd_requests_pending_idx ON lgpd_requests(created_at) WHERE status = 'pending';

ALTER TABLE lgpd_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE lgpd_requests FORCE ROW LEVEL SECURITY;

CREATE POLICY lgpd_requests_tenant_isolation ON lgpd_requests
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

COMMENT ON TABLE lgpd_requests IS 'Solicitações LGPD (export, erase, rectify, access). Processadas por job async.';
COMMENT ON COLUMN lgpd_requests.download_url IS 'URL assinada R2 para download da exportação. Expira em 7 dias.';

CREATE TRIGGER lgpd_requests_updated_at BEFORE UPDATE ON lgpd_requests FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
