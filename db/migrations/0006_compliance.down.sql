BEGIN;

DROP TABLE IF EXISTS lgpd_requests;
DROP TYPE IF EXISTS lgpd_request_status;
DROP TYPE IF EXISTS lgpd_request_type;
DROP TABLE IF EXISTS audit_log;
DROP TABLE IF EXISTS consents;

COMMIT;
