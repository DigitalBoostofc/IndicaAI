-- 0010_fraud_signals (rollback)

BEGIN;

DROP TABLE IF EXISTS fraud_evaluations;

COMMIT;
