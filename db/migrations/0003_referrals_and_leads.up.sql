-- 0003_referrals_and_leads
-- Referrals (with rule_snapshot), leads (state machine), sales

BEGIN;

-- =============================================================================
-- lead_status enum
-- =============================================================================
CREATE TYPE lead_status AS ENUM (
    'new',              -- lead acabou de ser criado
    'in_progress',      -- em atendimento
    'qualified',        -- qualificado pela empresa
    'closed',           -- fechou compra
    'lost'              -- não fechou / desistiu
);


-- =============================================================================
-- referrals (uma indicação = parceiro → lead, com snapshot da regra)
-- =============================================================================
CREATE TABLE referrals (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    program_id      uuid NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
    partner_id      uuid NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    partner_link_id uuid REFERENCES partner_links(id) ON DELETE SET NULL,
    rule_snapshot   jsonb NOT NULL,                   -- cópia da rules do programa no momento da criação
    split_choice    jsonb,                            -- escolha do parceiro em flexible_split (commission_pct, discount_pct)
    attribution_model text NOT NULL DEFAULT 'last_touch',
    attribution_score numeric(3,2) NOT NULL DEFAULT 0,  -- 0.00 a 1.00
    attributed_at   timestamptz,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX referrals_tenant_idx ON referrals(tenant_id);
CREATE INDEX referrals_program_idx ON referrals(program_id);
CREATE INDEX referrals_partner_idx ON referrals(partner_id);
CREATE INDEX referrals_created_idx ON referrals(created_at DESC);

ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals FORCE ROW LEVEL SECURITY;

CREATE POLICY referrals_tenant_isolation ON referrals
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

COMMENT ON TABLE referrals IS 'Indicações. Cada referral conecta um parceiro a um lead dentro de um programa.';
COMMENT ON COLUMN referrals.rule_snapshot IS 'Snapshot da rules do programa no momento da criação. Regra editada depois NÃO afeta referrals existentes.';
COMMENT ON COLUMN referrals.split_choice IS 'Escolha do parceiro para flexible_split: {commission_pct, discount_pct}. Null se não aplicável.';
COMMENT ON COLUMN referrals.attribution_score IS 'Confiança da atribuição: code_match=1.0, cookie=0.85, fingerprint=0.4. <0.5 = revisão manual.';

CREATE TRIGGER referrals_updated_at BEFORE UPDATE ON referrals FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- =============================================================================
-- leads (contatos indicados — state machine)
-- =============================================================================
CREATE TABLE leads (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    program_id      uuid NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
    referral_id     uuid REFERENCES referrals(id) ON DELETE SET NULL,
    name            text,
    email           text,                             -- PII; retention=5y
    email_hash      text,                             -- sha256(lower(email)) para dedup
    phone_e164      text,                             -- PII; retention=5y
    phone_hash      text NOT NULL,                    -- sha256(phone_e164) para dedup — NOT NULL pq telefone é obrigatório
    status          lead_status NOT NULL DEFAULT 'new',
    source          text NOT NULL DEFAULT 'referral'
                    CHECK (source IN ('referral', 'manual', 'whatsapp', 'import', 'widget')),
    notes           text,                             -- notas do atendente
    metadata        jsonb NOT NULL DEFAULT '{}',
    closed_at       timestamptz,                      -- quando status mudou pra 'closed'
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    UNIQUE(program_id, phone_hash)                    -- dedup: mesmo telefone = mesmo lead no programa
);

CREATE INDEX leads_tenant_idx ON leads(tenant_id);
CREATE INDEX leads_program_idx ON leads(program_id);
CREATE INDEX leads_referral_idx ON leads(referral_id) WHERE referral_id IS NOT NULL;
CREATE INDEX leads_status_idx ON leads(tenant_id, status);
CREATE INDEX leads_email_hash_idx ON leads(email_hash) WHERE email_hash IS NOT NULL;
CREATE INDEX leads_phone_hash_idx ON leads(phone_hash);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads FORCE ROW LEVEL SECURITY;

CREATE POLICY leads_tenant_isolation ON leads
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

COMMENT ON TABLE leads IS 'Leads/contatos indicados. State machine: new → in_progress → qualified → closed | lost.';
COMMENT ON COLUMN leads.email IS 'PII; retention=5y';
COMMENT ON COLUMN leads.phone_e164 IS 'PII; retention=5y';
COMMENT ON COLUMN leads.phone_hash IS 'sha256(phone_e164). NOT NULL — telefone é identificador primário do lead.';
COMMENT ON COLUMN leads.closed_at IS 'Timestamp quando lead foi fechado. Usado para calcular comissão e métricas.';

CREATE TRIGGER leads_updated_at BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- =============================================================================
-- sales (vendas confirmadas associadas a leads)
-- =============================================================================
CREATE TABLE sales (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    program_id      uuid NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
    lead_id         uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    referral_id     uuid REFERENCES referrals(id) ON DELETE SET NULL,
    partner_id      uuid REFERENCES partners(id) ON DELETE SET NULL,
    amount_cents    bigint NOT NULL,                  -- valor em centavos (evita float)
    currency        text NOT NULL DEFAULT 'BRL',
    external_id     text,                             -- ID da venda no sistema do cliente (ERP, CRM)
    status          text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'confirmed', 'refunded', 'cancelled')),
    confirmed_at    timestamptz,
    metadata        jsonb NOT NULL DEFAULT '{}',
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX sales_tenant_idx ON sales(tenant_id);
CREATE INDEX sales_program_idx ON sales(program_id);
CREATE INDEX sales_lead_idx ON sales(lead_id);
CREATE INDEX sales_partner_idx ON sales(partner_id) WHERE partner_id IS NOT NULL;
CREATE INDEX sales_status_idx ON sales(tenant_id, status);

ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales FORCE ROW LEVEL SECURITY;

CREATE POLICY sales_tenant_isolation ON sales
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

COMMENT ON TABLE sales IS 'Vendas associadas a leads. amount_cents em centavos para evitar erros de float.';
COMMENT ON COLUMN sales.amount_cents IS 'Valor da venda em centavos (BRL). 10000 = R$100,00.';

CREATE TRIGGER sales_updated_at BEFORE UPDATE ON sales FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
