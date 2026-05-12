-- 0007_rls_policies.down.sql
-- This migration only re-validates RLS state. The actual policies are dropped
-- with the tables in their respective down migrations.
-- Disabling RLS here would be dangerous — it's a verification-only migration.

-- No-op: policies are dropped when tables are dropped in earlier down migrations.
SELECT 1;
