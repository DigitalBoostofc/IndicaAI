-- 0004_rewards_and_payouts
-- Rewards (earned by referrals), payouts (actual money movement), idempotency keys

BEGIN;

-- =============================================================================
-- rewards (recompensas geradas por indicações que atenderam as regras)
-- =============================================================================
CREATE TABLE rewards (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    program_id      uuid NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
    referral_id     uuid NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
    partner_id      uuid NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    sale_id         uuid REFERENCES sales(id) ON DELETE SET NULL,
    type            text NOT NULL
                    CHECK (type IN ('commission_fixed', 'commission_pct', 'discount_for_lead',
                                    'flexible_split', 'goal_based', 'points', 'cashback',
                                    'recurring_commission')),
    amount_cents    bigint NOT NULL DEFAULT 0,         -- valor da recompensa em centavos
    currency        text NOT NULL DEFAULT 'BRL',
    status          text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'paid')),
    approved_at     timestamptz,
    approved_by     uuid REFERENCES users(id),
    rejected_reason text,
    metadata        jsonb NOT NULL DEFAULT '{}',       -- detalhes do cálculo (pct aplicado, split escolhido, etc)
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX rewards_tenant_idx ON rewards(tenant_id);
CREATE INDEX rewards_program_idx ON rewards(program_id);
CREATE INDEX rewards_partner_idx ON rewards(partner_id);
CREATE INDEX rewards_status_idx ON rewards(tenant_id, status);
CREATE INDEX rewards_referral_idx ON rewards(referral_id);

ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards FORCE ROW LEVEL SECURITY;

CREATE POLICY rewards_tenant_isolation ON rewards
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

COMMENT ON TABLE rewards IS 'Recompensas geradas pelas regras do programa. Status: pending → approved → paid (ou rejected/cancelled).';
COMMENT ON COLUMN rewards.amount_cents IS 'Valor da recompensa em centavos.';
COMMENT ON COLUMN rewards.metadata IS 'Detalhes do cálculo: pct aplicado, split escolhido, goal progress, etc.';

CREATE TRIGGER rewards_updated_at BEFORE UPDATE ON rewards FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- =============================================================================
-- payouts (pagamentos efetivos aos parceiros)
-- =============================================================================
CREATE TABLE payouts (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    partner_id      uuid NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    reward_ids      uuid[] NOT NULL,                  -- array de reward IDs incluídos neste payout
    amount_cents    bigint NOT NULL,                   -- valor total em centavos
    currency        text NOT NULL DEFAULT 'BRL',
    method          text NOT NULL
                    CHECK (method IN ('pix', 'bank_transfer', 'credit', 'coupon', 'physical', 'manual')),
    status          text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'processing', 'paid', 'failed', 'cancelled')),
    external_id     text,                             -- ID no gateway de pagamento (Asaas, etc)
    pix_key         text,                             -- chave Pix usada no momento do pagamento
    pix_key_type    text,
    paid_at         timestamptz,
    failed_at       timestamptz,
    failure_reason  text,
    attempts        integer NOT NULL DEFAULT 0,
    next_retry_at   timestamptz,
    metadata        jsonb NOT NULL DEFAULT '{}',
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX payouts_tenant_idx ON payouts(tenant_id);
CREATE INDEX payouts_partner_idx ON payouts(partner_id);
CREATE INDEX payouts_status_idx ON payouts(tenant_id, status);
CREATE INDEX payouts_next_retry_idx ON payouts(next_retry_at) WHERE status = 'failed' AND next_retry_at IS NOT NULL;

ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts FORCE ROW LEVEL SECURITY;

CREATE POLICY payouts_tenant_isolation ON payouts
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

COMMENT ON TABLE payouts IS 'Pagamentos efetivos aos parceiros. Um payout pode agrupar N rewards.';
COMMENT ON COLUMN payouts.reward_ids IS 'Array de UUIDs das rewards incluídas neste pagamento.';
COMMENT ON COLUMN payouts.pix_key IS 'Chave Pix usada no momento do pagamento. Snapshot — parceiro pode ter mudado depois.';

CREATE TRIGGER payouts_updated_at BEFORE UPDATE ON payouts FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- =============================================================================
-- idempotency_keys (previne duplicação de operações)
-- =============================================================================
CREATE TABLE idempotency_keys (
    key             text NOT NULL,
    tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    request_hash    text NOT NULL,                    -- sha256 do body do request
    response_body   jsonb,                            -- resposta cached
    status_code     integer,                          -- HTTP status code da resposta
    created_at      timestamptz NOT NULL DEFAULT now(),
    expires_at      timestamptz NOT NULL,             -- TTL — default 24h
    PRIMARY KEY (key, tenant_id)
);

CREATE INDEX idempotency_keys_expires_idx ON idempotency_keys(expires_at);

ALTER TABLE idempotency_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE idempotency_keys FORCE ROW LEVEL SECURITY;

CREATE POLICY idempotency_keys_tenant_isolation ON idempotency_keys
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

COMMENT ON TABLE idempotency_keys IS 'Chaves de idempotência para operações críticas (criação de leads, webhooks). TTL de 24h.';
COMMENT ON COLUMN idempotency_keys.request_hash IS 'sha256 do body. Se key+tenant match mas hash difere, retorna 422.';

COMMIT;
