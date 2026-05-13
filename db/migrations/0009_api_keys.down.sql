-- 0009_api_keys (rollback)

BEGIN;

DROP TABLE IF EXISTS api_keys;

COMMIT;
