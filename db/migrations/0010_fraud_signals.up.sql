-- 0010_fraud_signals
-- Fraud evaluation history for audit trail

BEGIN;

CREATE TABLE fraud_evaluations (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    partner_id      uuid NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    lead_id         uuid REFERENCES leads(id) ON DELETE SET NULL,
    score           integer NOT NULL DEFAULT 0,
    action          text NOT NULL CHECK (action IN ('ok', 'review', 'block')),
    signals         jsonb NOT NULL DEFAULT '[]',
    evidence        jsonb NOT NULL DEFAULT '{}',
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX fraud_evaluations_tenant_idx ON fraud_evaluations(tenant_id, created_at DESC);
CREATE INDEX fraud_evaluations_partner_idx ON fraud_evaluations(partner_id, created_at DESC);
CREATE INDEX fraud_evaluations_action_idx ON fraud_evaluations(tenant_id, action, created_at DESC);

ALTER TABLE fraud_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE fraud_evaluations FORCE ROW LEVEL SECURITY;

CREATE POLICY fraud_evaluations_tenant_isolation ON fraud_evaluations
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

COMMENT ON TABLE fraud_evaluations IS 'Histórico de avaliações de fraude. Append-only para auditoria.';
COMMENT ON COLUMN fraud_evaluations.score IS 'Score acumulado dos sinais (0-100+).';
COMMENT ON COLUMN fraud_evaluations.action IS 'Decisão: ok, review, block.';
COMMENT ON COLUMN fraud_evaluations.signals IS 'Array de sinais que dispararam com seus pontos.';
COMMENT ON COLUMN fraud_evaluations.evidence IS 'Evidência completa para debugging e auditoria.';

COMMIT;
