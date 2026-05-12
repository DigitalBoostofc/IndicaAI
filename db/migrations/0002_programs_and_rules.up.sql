-- 0002_programs_and_rules
-- Programs (with JSONB rules engine), partners, partner_links (unique slugs)

BEGIN;

-- =============================================================================
-- programs (cada programa de indicação de um tenant)
-- =============================================================================
CREATE TABLE programs (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name            text NOT NULL,
    description     text,
    status          text NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'active', 'paused', 'archived')),
    rules           jsonb NOT NULL,                   -- motor de regras versionado (ver architecture.md §4)
    redirect_type   text NOT NULL DEFAULT 'website'
                    CHECK (redirect_type IN ('website', 'whatsapp', 'landing', 'checkout')),
    redirect_url    text,                             -- destino do redirect após clique
    whatsapp_number text,                             -- se redirect_type = whatsapp
    settings        jsonb NOT NULL DEFAULT '{}',      -- config adicional (branding, custom fields)
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX programs_tenant_idx ON programs(tenant_id);
CREATE INDEX programs_tenant_status_idx ON programs(tenant_id, status);

ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs FORCE ROW LEVEL SECURITY;

CREATE POLICY programs_tenant_isolation ON programs
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

COMMENT ON TABLE programs IS 'Programas de indicação. Cada empresa (tenant) pode ter N programas.';
COMMENT ON COLUMN programs.rules IS 'Motor de regras JSONB versionado. Schema em architecture.md §4.2. Snapshot copiado para referrals.rule_snapshot na criação.';
COMMENT ON COLUMN programs.settings IS 'Configurações extras: branding do link, campos customizados no form, etc.';

CREATE TRIGGER programs_updated_at BEFORE UPDATE ON programs FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- =============================================================================
-- partners (parceiros/indicadores que participam de programas)
-- =============================================================================
CREATE TABLE partners (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    program_id      uuid NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
    user_id         uuid REFERENCES users(id) ON DELETE SET NULL,  -- parceiro pode ser user registrado
    name            text NOT NULL,
    email           text,                             -- PII; retention=5y
    email_hash      text,                             -- sha256(lower(email))
    phone_e164      text,                             -- PII; retention=5y
    phone_hash      text,                             -- sha256(phone_e164)
    document        text,                             -- CPF/CNPJ — PII; retention=5y
    document_hash   text,                             -- sha256(document) para dedup
    pix_key         text,                             -- PII; retention=5y (chave Pix para pagamento)
    pix_key_type    text CHECK (pix_key_type IN ('cpf', 'cnpj', 'email', 'phone', 'random')),
    status          text NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'suspended', 'blocked')),
    default_split   jsonb,                            -- split preference do parceiro (flexible_split)
    metadata        jsonb NOT NULL DEFAULT '{}',
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, program_id, email_hash),        -- um email por programa
    UNIQUE(tenant_id, program_id, phone_hash)         -- um telefone por programa
);

CREATE INDEX partners_tenant_idx ON partners(tenant_id);
CREATE INDEX partners_program_idx ON partners(program_id);
CREATE INDEX partners_user_idx ON partners(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX partners_email_hash_idx ON partners(email_hash) WHERE email_hash IS NOT NULL;
CREATE INDEX partners_phone_hash_idx ON partners(phone_hash) WHERE phone_hash IS NOT NULL;

ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE partners FORCE ROW LEVEL SECURITY;

CREATE POLICY partners_tenant_isolation ON partners
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

COMMENT ON TABLE partners IS 'Parceiros/indicadores que participam dos programas. Um user pode ser parceiro em N programas.';
COMMENT ON COLUMN partners.email IS 'PII; retention=5y';
COMMENT ON COLUMN partners.phone_e164 IS 'PII; retention=5y';
COMMENT ON COLUMN partners.document IS 'PII (CPF/CNPJ); retention=5y';
COMMENT ON COLUMN partners.pix_key IS 'PII; retention=5y';
COMMENT ON COLUMN partners.default_split IS 'Preferência de split do parceiro para flexible_split programs.';

CREATE TRIGGER partners_updated_at BEFORE UPDATE ON partners FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- =============================================================================
-- partner_links (slug único por parceiro por programa — tracking link)
-- =============================================================================
CREATE TABLE partner_links (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    program_id      uuid NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
    partner_id      uuid NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    slug            text NOT NULL,                    -- ex: karine, 8XK92A — único no sistema
    url             text NOT NULL,                    -- URL completa de redirect
    is_active       boolean NOT NULL DEFAULT true,
    click_count     integer NOT NULL DEFAULT 0,       -- denormalizado, atualizado async
    created_at      timestamptz NOT NULL DEFAULT now(),
    UNIQUE(slug)                                      -- slug é globalmente único (namespace no link)
);

CREATE INDEX partner_links_tenant_idx ON partner_links(tenant_id);
CREATE INDEX partner_links_partner_idx ON partner_links(partner_id);
CREATE INDEX partner_links_program_partner_idx ON partner_links(program_id, partner_id);

ALTER TABLE partner_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_links FORCE ROW LEVEL SECURITY;

CREATE POLICY partner_links_tenant_isolation ON partner_links
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

COMMENT ON TABLE partner_links IS 'Links de rastreamento únicos por parceiro. Slug é globalmente único para lookup rápido em /r/:slug.';
COMMENT ON COLUMN partner_links.slug IS 'Slug único global. Gerado com 8+ chars alfanuméricos. Index Btree para lookup em O(1).';
COMMENT ON COLUMN partner_links.click_count IS 'Denormalizado. Atualizado periodicamente via job async (não em tempo real no INSERT de click).';

COMMIT;
