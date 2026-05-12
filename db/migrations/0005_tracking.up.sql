-- 0005_tracking
-- click_events (prepared for monthly partitioning) and attributions (with scoring)

BEGIN;

-- =============================================================================
-- click_events (tracking de cliques — preparada para particionamento por mês)
-- =============================================================================
CREATE TABLE click_events (
    id              uuid NOT NULL DEFAULT gen_random_uuid(),
    tenant_id       uuid NOT NULL,
    program_id      uuid NOT NULL,
    partner_id      uuid NOT NULL,
    slug            text NOT NULL,
    visitor_id      uuid NOT NULL,                    -- UUIDv7 do cookie _iaref
    fingerprint     text NOT NULL,                    -- sha256(ip_/24 + ua + accept_lang + tenant_id)
    ip_inet         inet,                             -- IP real (anonimizado após 12 meses)
    ua              text,                             -- user agent completo
    accept_lang     text,
    referer         text,
    utm             jsonb,                            -- {source, medium, campaign, term, content}
    occurred_at     timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (id, occurred_at)                     -- PK composta com occurred_at para particionamento
);

-- Índices otimizados para hot paths do tracking engine
CREATE INDEX click_events_visitor_idx ON click_events(visitor_id, occurred_at DESC);
CREATE INDEX click_events_fingerprint_idx ON click_events(fingerprint, occurred_at DESC);
CREATE INDEX click_events_partner_idx ON click_events(partner_id, occurred_at DESC);
CREATE INDEX click_events_slug_idx ON click_events(slug, occurred_at DESC);
CREATE INDEX click_events_tenant_program_idx ON click_events(tenant_id, program_id, occurred_at DESC);

ALTER TABLE click_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE click_events FORCE ROW LEVEL SECURITY;

CREATE POLICY click_events_tenant_isolation ON click_events
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

COMMENT ON TABLE click_events IS 'Eventos de clique do tracking engine. Preparada para particionamento por mês em occurred_at.';
COMMENT ON COLUMN click_events.visitor_id IS 'UUIDv7 gerado pelo edge worker, armazenado no cookie _iaref.';
COMMENT ON COLUMN click_events.fingerprint IS 'sha256(ip_/24 + ua + accept_lang + tenant_id). Fallback de baixa confiança.';
COMMENT ON COLUMN click_events.ip_inet IS 'IP real do visitante. PII; retention=12m (anonimizar após 12 meses).';
COMMENT ON COLUMN click_events.utm IS 'UTM parameters do link de rastreamento.';


-- =============================================================================
-- attributions (atribuição final de conversão ao parceiro)
-- =============================================================================
CREATE TABLE attributions (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    referral_id     uuid NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
    partner_id      uuid NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    click_id        uuid,                             -- click_events.id que originou (null se atribuição por código direto)
    model           text NOT NULL DEFAULT 'last_touch'
                    CHECK (model IN ('last_touch', 'first_touch', 'linear', 'custom')),
    score           numeric(3,2) NOT NULL DEFAULT 0,  -- 0.00 a 1.00 — confiança da atribuição
    matched_by      text NOT NULL
                    CHECK (matched_by IN ('code', 'cookie', 'fingerprint', 'manual')),
    reason          text,                             -- justificativa quando matched_by = 'manual'
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX attributions_tenant_idx ON attributions(tenant_id);
CREATE INDEX attributions_referral_idx ON attributions(referral_id);
CREATE INDEX attributions_partner_idx ON attributions(partner_id);
CREATE INDEX attributions_click_idx ON attributions(click_id) WHERE click_id IS NOT NULL;

ALTER TABLE attributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attributions FORCE ROW LEVEL SECURITY;

CREATE POLICY attributions_tenant_isolation ON attributions
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

COMMENT ON TABLE attributions IS 'Atribuições de conversão. Uma referral pode ter múltiplas tentativas; a válida é a de maior score.';
COMMENT ON COLUMN attributions.score IS 'Confiança: code=1.0, cookie=0.85, fingerprint=0.4. <0.5 → revisão manual.';
COMMENT ON COLUMN attributions.matched_by IS 'Mecanismo de match: code (referral code), cookie (_iaref), fingerprint (hash), manual (atendente).';
COMMENT ON COLUMN attributions.click_id IS 'Referência ao click_event que originou. Null quando atribuição direta por código sem clique registrado.';

COMMIT;
