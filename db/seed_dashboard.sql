-- Seed dashboard test data for the most recent tenant + its first program.
-- Idempotent within a single run: uses tenant_id + suffix to avoid clobbering.
-- Run with: psql "$DATABASE_URL" -f db/seed_dashboard.sql

\set ON_ERROR_STOP on

DO $$
DECLARE
    v_tenant_id uuid;
    v_program_id uuid;
    v_p1 uuid; v_p2 uuid; v_p3 uuid; v_p4 uuid;
    v_link1 uuid; v_link2 uuid; v_link3 uuid; v_link4 uuid;
    v_ref uuid;
    v_lead uuid;
    v_sale uuid;
    v_suffix text;
    i int;
    n int;
    day_offset int;
    partner_record record;
    sale_count int;
BEGIN
    -- pick the most recent tenant
    SELECT id INTO v_tenant_id FROM tenants ORDER BY created_at DESC LIMIT 1;
    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'No tenant found. Register a user first.';
    END IF;

    -- pick the most recent program for that tenant, or create one
    SELECT id INTO v_program_id FROM programs WHERE tenant_id = v_tenant_id ORDER BY created_at DESC LIMIT 1;
    IF v_program_id IS NULL THEN
        v_program_id := gen_random_uuid();
        INSERT INTO programs (id, tenant_id, name, description, status, rules, redirect_type, whatsapp_number)
        VALUES (v_program_id, v_tenant_id, 'Programa Seed', 'Seed program',
                'active',
                '{"schemaVersion":1,"trigger":"sale.confirmed","attributionWindowDays":30,"reward":{"type":"commission_fixed","amount_brl":100},"payout":{"method":"pix","schedule":"on_approval","minAmountBrl":50},"limits":{}}'::jsonb,
                'whatsapp', '+5511999999999');
    END IF;

    -- set tenant context for RLS
    PERFORM set_config('app.current_tenant', v_tenant_id::text, true);

    -- unique suffix per run to avoid slug collisions
    v_suffix := substring(md5(random()::text), 1, 6);

    RAISE NOTICE 'Seeding for tenant=% program=% suffix=%', v_tenant_id, v_program_id, v_suffix;

    -- ── Partners ────────────────────────────────────────────────────────────
    v_p1 := gen_random_uuid();
    v_p2 := gen_random_uuid();
    v_p3 := gen_random_uuid();
    v_p4 := gen_random_uuid();

    INSERT INTO partners (id, tenant_id, program_id, name, email, phone_hash, status) VALUES
        (v_p1, v_tenant_id, v_program_id, 'Karine Souza',  'karine_'||v_suffix||'@example.com', encode(sha256(('+5511911111111'||v_suffix)::bytea), 'hex'), 'active'),
        (v_p2, v_tenant_id, v_program_id, 'Pedro Almeida', 'pedro_'||v_suffix||'@example.com',  encode(sha256(('+5511922222222'||v_suffix)::bytea), 'hex'), 'active'),
        (v_p3, v_tenant_id, v_program_id, 'Ana Costa',     'ana_'||v_suffix||'@example.com',    encode(sha256(('+5511933333333'||v_suffix)::bytea), 'hex'), 'active'),
        (v_p4, v_tenant_id, v_program_id, 'João Lima',     'joao_'||v_suffix||'@example.com',   encode(sha256(('+5511944444444'||v_suffix)::bytea), 'hex'), 'active');

    -- ── Partner links ──────────────────────────────────────────────────────
    v_link1 := gen_random_uuid();
    v_link2 := gen_random_uuid();
    v_link3 := gen_random_uuid();
    v_link4 := gen_random_uuid();

    INSERT INTO partner_links (id, tenant_id, program_id, partner_id, slug, url) VALUES
        (v_link1, v_tenant_id, v_program_id, v_p1, 'karine-'||v_suffix, 'https://indica.ai/r/karine-'||v_suffix),
        (v_link2, v_tenant_id, v_program_id, v_p2, 'pedro-'||v_suffix,  'https://indica.ai/r/pedro-'||v_suffix),
        (v_link3, v_tenant_id, v_program_id, v_p3, 'ana-'||v_suffix,    'https://indica.ai/r/ana-'||v_suffix),
        (v_link4, v_tenant_id, v_program_id, v_p4, 'joao-'||v_suffix,   'https://indica.ai/r/joao-'||v_suffix);

    -- ── Click events spread across 14 days ─────────────────────────────────
    -- Volume per partner per day: karine high, pedro mid, ana low, joão very low
    FOR day_offset IN 0..13 LOOP
        -- karine: 15-35 clicks/day
        FOR i IN 1..(15 + (random()*20)::int) LOOP
            INSERT INTO click_events (tenant_id, program_id, partner_id, slug, visitor_id, fingerprint, occurred_at)
            VALUES (v_tenant_id, v_program_id, v_p1, 'karine-'||v_suffix,
                    gen_random_uuid(), md5(random()::text),
                    now() - (day_offset || ' days')::interval - (random()*86400 || ' seconds')::interval);
        END LOOP;
        -- pedro: 8-18
        FOR i IN 1..(8 + (random()*10)::int) LOOP
            INSERT INTO click_events (tenant_id, program_id, partner_id, slug, visitor_id, fingerprint, occurred_at)
            VALUES (v_tenant_id, v_program_id, v_p2, 'pedro-'||v_suffix,
                    gen_random_uuid(), md5(random()::text),
                    now() - (day_offset || ' days')::interval - (random()*86400 || ' seconds')::interval);
        END LOOP;
        -- ana: 3-8
        FOR i IN 1..(3 + (random()*5)::int) LOOP
            INSERT INTO click_events (tenant_id, program_id, partner_id, slug, visitor_id, fingerprint, occurred_at)
            VALUES (v_tenant_id, v_program_id, v_p3, 'ana-'||v_suffix,
                    gen_random_uuid(), md5(random()::text),
                    now() - (day_offset || ' days')::interval - (random()*86400 || ' seconds')::interval);
        END LOOP;
        -- joão: 1-3
        FOR i IN 1..(1 + (random()*2)::int) LOOP
            INSERT INTO click_events (tenant_id, program_id, partner_id, slug, visitor_id, fingerprint, occurred_at)
            VALUES (v_tenant_id, v_program_id, v_p4, 'joao-'||v_suffix,
                    gen_random_uuid(), md5(random()::text),
                    now() - (day_offset || ' days')::interval - (random()*86400 || ' seconds')::interval);
        END LOOP;
    END LOOP;

    -- ── Referrals + Leads + Sales + Rewards ────────────────────────────────
    FOR partner_record IN
        SELECT p.id AS pid, p.name AS pname,
               CASE p.name
                   WHEN 'Karine Souza' THEN 15
                   WHEN 'Pedro Almeida' THEN 8
                   WHEN 'Ana Costa' THEN 5
                   WHEN 'João Lima' THEN 3
                   ELSE 1
               END AS lead_count
        FROM partners p
        WHERE p.id IN (v_p1, v_p2, v_p3, v_p4)
    LOOP
        FOR i IN 1..partner_record.lead_count LOOP
            v_ref := gen_random_uuid();
            v_lead := gen_random_uuid();
            day_offset := (random()*13)::int;

            INSERT INTO referrals (id, tenant_id, program_id, partner_id, rule_snapshot, attribution_model, attribution_score, attributed_at, created_at)
            VALUES (v_ref, v_tenant_id, v_program_id, partner_record.pid,
                    '{"reward":{"type":"commission_fixed","amount_brl":100}}'::jsonb,
                    'last_touch', 1.0,
                    now() - (day_offset || ' days')::interval,
                    now() - (day_offset || ' days')::interval);

            INSERT INTO leads (id, tenant_id, program_id, referral_id, name, phone_hash, status, source, created_at, closed_at)
            VALUES (v_lead, v_tenant_id, v_program_id, v_ref,
                    (ARRAY['Maria Silva','José Souza','Ana Pereira','Carlos Oliveira','Fernanda Rocha','Lucas Mendes','Patrícia Lima','Rafael Costa','Juliana Alves','Bruno Cardoso','Camila Dias','Diego Martins','Eduarda Pinto','Felipe Nunes','Gabriela Reis'])[1 + (random()*14)::int]
                    || ' ' || v_suffix || '-' || i,
                    encode(sha256(((partner_record.pid::text)||'-'||i||'-'||v_suffix)::bytea), 'hex'),
                    -- status distribution: 40% closed, 30% in_progress, 20% new, 10% lost
                    (CASE WHEN random() < 0.40 THEN 'closed'
                          WHEN random() < 0.70 THEN 'in_progress'
                          WHEN random() < 0.90 THEN 'new'
                          ELSE 'lost' END)::lead_status,
                    'referral',
                    now() - (day_offset || ' days')::interval,
                    CASE WHEN random() < 0.40 THEN now() - (day_offset || ' days')::interval ELSE NULL END);

            -- If status is closed, create a sale + reward
            IF (SELECT status FROM leads WHERE id = v_lead) = 'closed' THEN
                v_sale := gen_random_uuid();
                INSERT INTO sales (id, tenant_id, program_id, lead_id, referral_id, partner_id, amount_cents, currency, status, confirmed_at, created_at)
                VALUES (v_sale, v_tenant_id, v_program_id, v_lead, v_ref, partner_record.pid,
                        (50000 + (random()*150000)::bigint),  -- R$500 a R$2000
                        'BRL', 'confirmed',
                        now() - (day_offset || ' days')::interval,
                        now() - (day_offset || ' days')::interval);

                INSERT INTO rewards (tenant_id, program_id, referral_id, partner_id, sale_id, type, amount_cents, currency, status, created_at)
                VALUES (v_tenant_id, v_program_id, v_ref, partner_record.pid, v_sale,
                        'commission_fixed', 10000, 'BRL',
                        (CASE WHEN random() < 0.6 THEN 'approved' ELSE 'pending' END),
                        now() - (day_offset || ' days')::interval);
            END IF;
        END LOOP;
    END LOOP;

    RAISE NOTICE 'Done. tenant=% program=%', v_tenant_id, v_program_id;
END $$;

-- Print summary
SELECT
    (SELECT COUNT(*) FROM partners) AS partners,
    (SELECT COUNT(*) FROM partner_links) AS links,
    (SELECT COUNT(*) FROM click_events) AS clicks,
    (SELECT COUNT(*) FROM referrals) AS referrals,
    (SELECT COUNT(*) FROM leads) AS leads,
    (SELECT COUNT(*) FROM sales) AS sales,
    (SELECT COUNT(*) FROM rewards) AS rewards;
