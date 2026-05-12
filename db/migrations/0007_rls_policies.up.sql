-- 0007_rls_policies
-- Explicit RLS policy audit — consolidates all policies in one migration for review.
-- This migration is IDEMPOTENT — it only adds policies that might have been missed
-- and serves as the single source of truth for RLS in the project.

BEGIN;

-- =============================================================================
-- Helper: saas_admin role bypass
-- Users with role='saas_admin' need to see all tenants' data.
-- This is done via a Postgres role 'saas_admin' that BYPASSES RLS.
-- The app layer sets this role for admin sessions.
-- =============================================================================

-- Ensure all domain tables have RLS enabled + forced + policy
-- This migration re-applies idempotently (CREATE POLICY IF NOT EXISTS not available in PG16,
-- so we use DO blocks with exception handling).

-- tenants: no RLS (global table managed by SaaS owner)

-- users: no RLS (global, accessed via tenant_members join)

-- tenant_members: no direct RLS — access control via app layer
-- (user can only see their own memberships)
-- But we add a policy for tenant-scoped access:
DO $$
BEGIN
    ALTER TABLE tenant_members ENABLE ROW LEVEL SECURITY;
    ALTER TABLE tenant_members FORCE ROW LEVEL SECURITY;
    CREATE POLICY tenant_members_tenant_isolation ON tenant_members
        USING (tenant_id = current_setting('app.current_tenant', true)::uuid);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- sessions: app-managed, no RLS needed (user_id based access)

-- refresh_tokens: app-managed, no RLS needed (token_hash based access)

-- api_keys: already in 0001, verify
DO $$
BEGIN
    ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
    ALTER TABLE api_keys FORCE ROW LEVEL SECURITY;
    CREATE POLICY api_keys_tenant_isolation ON api_keys
        USING (tenant_id = current_setting('app.current_tenant', true)::uuid);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- programs: already in 0002, verify
DO $$
BEGIN
    ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
    ALTER TABLE programs FORCE ROW LEVEL SECURITY;
    CREATE POLICY programs_tenant_isolation ON programs
        USING (tenant_id = current_setting('app.current_tenant', true)::uuid);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- partners: already in 0002, verify
DO $$
BEGIN
    ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
    ALTER TABLE partners FORCE ROW LEVEL SECURITY;
    CREATE POLICY partners_tenant_isolation ON partners
        USING (tenant_id = current_setting('app.current_tenant', true)::uuid);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- partner_links: already in 0002, verify
DO $$
BEGIN
    ALTER TABLE partner_links ENABLE ROW LEVEL SECURITY;
    ALTER TABLE partner_links FORCE ROW LEVEL SECURITY;
    CREATE POLICY partner_links_tenant_isolation ON partner_links
        USING (tenant_id = current_setting('app.current_tenant', true)::uuid);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- referrals: already in 0003, verify
DO $$
BEGIN
    ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
    ALTER TABLE referrals FORCE ROW LEVEL SECURITY;
    CREATE POLICY referrals_tenant_isolation ON referrals
        USING (tenant_id = current_setting('app.current_tenant', true)::uuid);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- leads: already in 0003, verify
DO $$
BEGIN
    ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
    ALTER TABLE leads FORCE ROW LEVEL SECURITY;
    CREATE POLICY leads_tenant_isolation ON leads
        USING (tenant_id = current_setting('app.current_tenant', true)::uuid);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- sales: already in 0003, verify
DO $$
BEGIN
    ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
    ALTER TABLE sales FORCE ROW LEVEL SECURITY;
    CREATE POLICY sales_tenant_isolation ON sales
        USING (tenant_id = current_setting('app.current_tenant', true)::uuid);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- rewards: already in 0004, verify
DO $$
BEGIN
    ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
    ALTER TABLE rewards FORCE ROW LEVEL SECURITY;
    CREATE POLICY rewards_tenant_isolation ON rewards
        USING (tenant_id = current_setting('app.current_tenant', true)::uuid);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- payouts: already in 0004, verify
DO $$
BEGIN
    ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
    ALTER TABLE payouts FORCE ROW LEVEL SECURITY;
    CREATE POLICY payouts_tenant_isolation ON payouts
        USING (tenant_id = current_setting('app.current_tenant', true)::uuid);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- idempotency_keys: already in 0004, verify
DO $$
BEGIN
    ALTER TABLE idempotency_keys ENABLE ROW LEVEL SECURITY;
    ALTER TABLE idempotency_keys FORCE ROW LEVEL SECURITY;
    CREATE POLICY idempotency_keys_tenant_isolation ON idempotency_keys
        USING (tenant_id = current_setting('app.current_tenant', true)::uuid);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- click_events: already in 0005, verify
DO $$
BEGIN
    ALTER TABLE click_events ENABLE ROW LEVEL SECURITY;
    ALTER TABLE click_events FORCE ROW LEVEL SECURITY;
    CREATE POLICY click_events_tenant_isolation ON click_events
        USING (tenant_id = current_setting('app.current_tenant', true)::uuid);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- attributions: already in 0005, verify
DO $$
BEGIN
    ALTER TABLE attributions ENABLE ROW LEVEL SECURITY;
    ALTER TABLE attributions FORCE ROW LEVEL SECURITY;
    CREATE POLICY attributions_tenant_isolation ON attributions
        USING (tenant_id = current_setting('app.current_tenant', true)::uuid);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- consents: already in 0006, verify
DO $$
BEGIN
    ALTER TABLE consents ENABLE ROW LEVEL SECURITY;
    ALTER TABLE consents FORCE ROW LEVEL SECURITY;
    CREATE POLICY consents_tenant_isolation ON consents
        USING (tenant_id = current_setting('app.current_tenant', true)::uuid);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- audit_log: already in 0006, verify
DO $$
BEGIN
    ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
    ALTER TABLE audit_log FORCE ROW LEVEL SECURITY;
    CREATE POLICY audit_log_tenant_isolation ON audit_log
        USING (tenant_id = current_setting('app.current_tenant', true)::uuid);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- lgpd_requests: already in 0006, verify
DO $$
BEGIN
    ALTER TABLE lgpd_requests ENABLE ROW LEVEL SECURITY;
    ALTER TABLE lgpd_requests FORCE ROW LEVEL SECURITY;
    CREATE POLICY lgpd_requests_tenant_isolation ON lgpd_requests
        USING (tenant_id = current_setting('app.current_tenant', true)::uuid);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- Verify: query to list all tables with RLS status
-- Run: SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
-- Expected: all domain tables have rowsecurity = true
-- =============================================================================

COMMIT;
