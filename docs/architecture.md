# Indica AÍ! — Arquitetura Técnica (v1.0)

> Documento produzido por @arch-chief | 2026-05-12
> Decisões aqui valem como contrato para `@backend-chief`, `@frontend-chief`, `@db-chief`, `@devops-chief`, `@security-chief`. Mudanças exigem revisão do `@arch-chief`.

**Stack obrigatória:** Go no backend, LGPD desde dia 1, multi-tenant.

**Princípios diretores:**
1. **Postgres carrega mais peso do que parece.** RLS, JSONB e River reduzem 3 dependências externas no MVP.
2. **Monólito modular antes de microserviços.** Domínios separados em pacotes, não em redes.
3. **O motor de regras é dado, não código.** Adicionar uma 4ª regra não deve exigir deploy se o tipo já existir.
4. **Tracking nunca bloqueia o usuário.** Edge handler responde em <50ms, persistência é assíncrona.

---

## 1. Stack Completa

### 1.1 Backend (Go 1.23+)

| Camada | Escolha | Justificativa |
|--------|---------|---------------|
| Roteador HTTP | **`go-chi/chi v5`** | Idiomático ao `net/http` padrão, middlewares compostáveis, sem reescrever o ecossistema como Gin/Fiber. Migrável trivialmente para `http.ServeMux` da stdlib se preciso. |
| DB Driver | **`jackc/pgx v5`** | Driver Postgres mais performático e completo do ecossistema Go. Suporta `LISTEN/NOTIFY`, COPY, prepared statements nativos. |
| Acesso a dados | **`sqlc`** | Gera código Go type-safe a partir de SQL real. Sem mágica de ORM, sem N+1 escondido, queries auditáveis. Trade-off aceito: scaffolding maior do que GORM, mas legibilidade e performance compensam. |
| Migrations | **`golang-migrate/migrate`** | Padrão da indústria, suporta `up/down`, integra com CI. |
| Validação | **`go-playground/validator v10`** | Tags struct, custom validators, mensagens i18n. |
| Filas/Jobs | **`riverqueue/river`** (MVP) → migrar para Asynq/Redis se volume justificar | River roda sobre Postgres (uma dependência a menos no MVP), jobs type-safe em Go, dashboard incluso, transacional com a operação que cria o job (crítico para "criou-lead → enfileirou-atribuição" sem dual-write bug). |
| Cache/Rate limit | **`redis/rueidis`** | Cliente Redis moderno, pipelining automático, melhor throughput que `go-redis`. |
| Logs | **`log/slog` (stdlib)** + handler JSON | Stdlib, zero dep, structured logging, contextual via `slog.With(ctx)`. |
| Métricas | **`prometheus/client_golang`** + **OpenTelemetry SDK** | Métricas Prometheus + traces OTel exportados para Grafana Cloud/Tempo. |
| Config | **`caarlos0/env/v10`** | Env vars tipadas em struct, simples, sem YAML escondido. |
| Auth tokens | **`golang-jwt/jwt v5`** + **`crypto/argon2`** para hash de senha | JWT para acesso (curto), refresh token rotativo armazenado em DB. Argon2id é o padrão OWASP atual. |
| HTTP client | stdlib + **`hashicorp/go-retryablehttp`** | Retries exponenciais para webhooks de saída e integrações. |
| Testes | **`stretchr/testify`** + **`testcontainers-go`** | Testify para asserts, testcontainers para Postgres/Redis reais em testes de integração. |
| Mock/stub HTTP | **`h2non/gock`** | Mock de chamadas HTTP externas em testes. |
| ID generation | **`google/uuid`** (UUIDv7) | UUIDv7 é ordenável por tempo — melhor para índices Btree do que UUIDv4. |

### 1.2 Frontend

| Camada | Escolha | Justificativa |
|--------|---------|---------------|
| Framework | **Next.js 15 (App Router) + React 19** | Suporta as 3 áreas (dashboard empresa, painel parceiro, landings públicas) no mesmo monorepo. SSR/ISR para landings (SEO), CSR para dashboards. Server Actions diminuem boilerplate de API REST onde cabe. |
| Linguagem | **TypeScript estrito** | `strict: true`, sem `any` exceto em fronteiras justificadas. |
| Estado servidor | **TanStack Query v5** | Cache, invalidation, optimistic updates, sem Redux para 90% dos casos. |
| Estado cliente | **Zustand** | Apenas para estado verdadeiramente UI-local (sidebar, wizard step). Sem Redux. |
| Formulários | **`react-hook-form` + `zod`** | Validação isomórfica (mesmo schema valida frontend e backend Go via geração) — usar `zod-to-json-schema` e validar igual no Go via `xeipuuv/gojsonschema` quando necessário. |
| Estilo | **Tailwind CSS v4** | Utility-first, build rápido com nova engine Oxide. |
| Componentes | **shadcn/ui** (Radix primitives) | Componentes copiados (não dependência), acessibilidade Radix nativa, customizável. |
| Gráficos | **Recharts** (dashboards) | API declarativa, leve, suficiente para os gráficos do MVP. |
| Tabelas | **TanStack Table v8** | Headless, performático para listas grandes de leads/indicações. |
| Build | **Turbopack** (integrado Next.js 15) | Substituto do Webpack, dev server rápido. |
| Lint/format | **Biome** | Substitui ESLint + Prettier, 10x mais rápido, configuração mínima. |

### 1.3 Banco de Dados, Cache e Filas

| Componente | Escolha | Justificativa |
|------------|---------|---------------|
| Banco principal | **PostgreSQL 16** | RLS nativo para multi-tenancy seguro, JSONB indexável (motor de regras), `pg_trgm` para busca de parceiros, `LISTEN/NOTIFY` para tempo-real opcional. Provisão managed barata em qualquer cloud. |
| Cache | **Redis 7** | Sessions, rate limit (token bucket via Lua scripts), idempotency keys de webhooks, contadores de cliques agregados antes de flush. |
| Filas | **River (Postgres)** no MVP | Mesma DB que dados de domínio = jobs criados em transação com dados (não há "job criado mas dado não persistiu"). Quando volume justificar (>500 jobs/seg), introduzir Asynq/Redis para jobs de tracking quentes e manter River para jobs transacionais (pagamentos, atribuição). |
| Object Storage | **Cloudflare R2** | S3-compatible, **sem egress fee** (crítico para download de brindes, exportações LGPD, relatórios). |
| Search (futuro) | Postgres FTS no início, **Typesense** se necessário | Sem ElasticSearch no MVP. |

### 1.4 Cloud, Infra e Observabilidade

| Componente | Escolha (MVP) | Plano de escala |
|------------|---------------|------------------|
| Hosting API/Workers | **Fly.io** | Deploy Docker simples, multi-region (incluir GRU/São Paulo), Postgres managed integrado, IPv4 dedicado por app. Custo previsível (~$5–30/mês no MVP). Migrar para ECS Fargate ou GCP Cloud Run em >$500/mês. |
| Banco hospedado | **Neon** (Postgres serverless) ou **Fly.io Postgres** | Neon: branching para staging gratuito, autoscaling. Trade-off: cold start em planos free. Fly.io Postgres: zero-distance da API, sem cold start, mas gestão manual de backups. **Recomendação MVP:** Fly.io Postgres por simplicidade; Neon se preview environments por PR forem prioridade. |
| Frontend hosting | **Vercel** (Hobby/Pro) | Otimização nativa Next.js, edge functions para tracking, ISR para landings. Alternativa econômica: Cloudflare Pages com OpenNext. |
| CDN/DNS/WAF | **Cloudflare** (free tier) | Cobre DNS, CDN, WAF básico, R2, Workers para tracking edge. |
| Tracking edge | **Cloudflare Workers** (V8 isolates) | Latência <50ms global, register-click sem ida à Fly.io. Worker apenas registra evento + redireciona; persistência via async fetch para API. |
| CI/CD | **GitHub Actions** | Lint → test → build → deploy. Cache de modules + Docker layer cache. |
| Container registry | GHCR (GitHub) | Incluído no GitHub. |
| IaC | **Terraform** + **Fly.io provider** + Cloudflare provider | Único modo viável de versionar config de DNS/Worker/Fly. |
| Secrets | **Doppler** ou **Fly.io secrets** | MVP: Fly.io secrets (incluído). Doppler quando time crescer. |
| Logs | **Better Stack (Logtail)** | Free tier 1GB/mês, query SQL-like. Coleta via stdout dos containers. |
| Métricas | **Grafana Cloud free tier** (10k series) | Prometheus scrape + Loki para logs em escala. |
| Traces | **Grafana Tempo** (free tier) ou **Honeycomb** | OTel SDK exporta para qualquer destino OTLP. |
| Erros | **Sentry** (free tier) | Stack traces, breadcrumbs, performance. SDK Go oficial. |
| Uptime | **Better Stack** ou **Healthchecks.io** | Status page público + alertas via Slack/email. |

### 1.5 Integrações Externas

| Categoria | Escolha primária | Backup/alternativa |
|-----------|------------------|---------------------|
| Gateway pagamento | **Asaas** (Pix nativo BR, fee baixo) | Stripe (cartão internacional), Pagar.me |
| Email transacional | **Resend** | Postmark, AWS SES |
| WhatsApp Business API | **Twilio** ou **Z-API** | Sandbox de desenvolvimento sempre obrigatório |
| SMS (fallback OTP) | **Twilio** | — |

---

## 2. Diagrama de Arquitetura

```
                                      ┌──────────────────────────────────┐
                                      │     Cloudflare DNS + WAF         │
                                      └─────────────┬────────────────────┘
                                                    │
              ┌─────────────────────────────────────┴─────────────────────────────────────┐
              │                                                                           │
              ▼                                                                           ▼
   ┌──────────────────────┐                                              ┌──────────────────────────────┐
   │  Cloudflare Workers  │  ←  GET /r/:slug                             │   Vercel (Next.js 15)        │
   │  TRACKING EDGE       │     (clique do link)                         │   - Dashboard empresa        │
   │  - lê/grava cookie   │                                              │   - Painel parceiro          │
   │  - hash fingerprint  │                                              │   - Landings públicas        │
   │  - 302 redirect      │     POST /events  ───────────────────┐       │   - Widget embed (JS)        │
   │    (WhatsApp/site)   │     (async, fire-and-forget)         │       └──────────────┬───────────────┘
   └──────────────────────┘                                      │                      │
                                                                 │                      │ HTTPS
                                                                 ▼                      ▼
                                              ┌─────────────────────────────────────────────────────┐
                                              │     Fly.io — região GRU                              │
                                              │                                                      │
                                              │   ┌──────────────────┐     ┌──────────────────┐     │
                                              │   │   API service    │     │   Worker service │     │
                                              │   │   (cmd/api)      │◄────┤   (cmd/worker)   │     │
                                              │   │   chi router     │     │   River jobs:    │     │
                                              │   │   - REST/JSON    │     │   - attribution  │     │
                                              │   │   - tenant mw    │     │   - payouts      │     │
                                              │   │   - auth JWT     │     │   - notifications│     │
                                              │   └────────┬─────────┘     │   - webhook send │     │
                                              │            │               └────────┬─────────┘     │
                                              │            │                        │               │
                                              │            ▼                        ▼               │
                                              │   ┌─────────────────────────────────────────┐       │
                                              │   │   Postgres 16 (Fly.io managed)          │       │
                                              │   │   - dados de domínio                    │       │
                                              │   │   - River queue (mesma DB)              │       │
                                              │   │   - RLS por tenant_id                   │       │
                                              │   └─────────────────────────────────────────┘       │
                                              │                                                      │
                                              │   ┌─────────────────────────────────────────┐       │
                                              │   │   Redis (Upstash ou Fly.io)             │       │
                                              │   │   - rate limit (token bucket)           │       │
                                              │   │   - sessions/refresh tokens             │       │
                                              │   │   - idempotency cache                   │       │
                                              │   │   - hot counters (cliques agregados)    │       │
                                              │   └─────────────────────────────────────────┘       │
                                              └─────────────────────────────────────────────────────┘
                                                            │                  │
                                                            ▼                  ▼
                                              ┌──────────────────┐   ┌──────────────────┐
                                              │  Cloudflare R2   │   │  Integrações:    │
                                              │  - exportações   │   │  - Asaas/Pix     │
                                              │  - brindes       │   │  - Twilio/Z-API  │
                                              │  - LGPD dumps    │   │  - Resend email  │
                                              └──────────────────┘   │  - Webhooks out  │
                                                                     └──────────────────┘
                                                                              │
                                              ┌──────────────────────────────┴──────────────────┐
                                              ▼                                                 ▼
                                ┌──────────────────────┐                            ┌──────────────────────┐
                                │   Grafana Cloud      │                            │   Sentry             │
                                │   - métricas Prom    │                            │   - erros backend    │
                                │   - logs Loki        │                            │   - erros frontend   │
                                │   - traces Tempo     │                            └──────────────────────┘
                                └──────────────────────┘
```

**Pontos críticos do diagrama:**

- **Tracking Edge separado da API.** Worker no Cloudflare responde ao `/r/:slug` em <50ms. A API só recebe o evento via POST assíncrono (sem bloquear o redirect). Fallback: se Worker indisponível, a própria API serve `/r/:slug` (mesma rota).
- **River roda na mesma Postgres.** Job de "atribuir comissão" é inserido na **mesma transação** que cria o lead. Sem inconsistência possível.
- **Frontend é stateless na Vercel.** Toda autenticação via JWT em cookie HttpOnly + chamadas para a API Fly.io. Server Actions usadas só onde simplifica (formulários de cadastro de programa, por exemplo).

---

## 3. Estratégia de Multi-Tenancy

### 3.1 Decisão

**`tenant_id UUID NOT NULL` em toda tabela de domínio + Row Level Security (RLS) no Postgres.**

### 3.2 Trade-offs avaliados

| Estratégia | Isolamento | Custo operacional | Migrations | Escala (1000+ tenants) | Decisão |
|------------|------------|-------------------|------------|------------------------|---------|
| **Banco por tenant** | Máximo | Alto (provisionar/manter N bancos) | Tooling custom | Inviável | Rejeitado |
| **Schema por tenant** | Alto | Médio-alto (search_path por conn) | N schemas para migrar | Pool de conexões vira problema | Rejeitado |
| **`tenant_id` + RLS** | Alto (DB enforça) | Baixo | Trivial | Boa | **Escolhido** |
| **`tenant_id` sem RLS** | Depende só do app | Baixo | Trivial | Boa | Rejeitado (frágil) |

**Por que não schema-per-tenant:** SaaS B2B com prospecção de centenas de pequenas empresas (óticas, clínicas). Cada onboarding novo não pode requerer rodar migration em N schemas. PgBouncer em transaction pooling não combina bem com `SET search_path` por sessão. RLS resolve com um custo de planejamento de query desprezível para tabelas com índice em `tenant_id`.

### 3.3 Implementação

**Schema (exemplo):**
```sql
CREATE TABLE programs (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id    uuid NOT NULL REFERENCES tenants(id),
    name         text NOT NULL,
    rules        jsonb NOT NULL,
    created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX programs_tenant_idx ON programs(tenant_id);

ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs FORCE ROW LEVEL SECURITY;

CREATE POLICY programs_tenant_isolation ON programs
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid);
```

**Middleware Go (essencial):**
```go
// internal/api/middleware/tenant.go
func TenantInjector(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        tid := extractTenantFromJWTOrSubdomain(r)
        if tid == uuid.Nil {
            http.Error(w, "tenant required", http.StatusUnauthorized)
            return
        }
        ctx := context.WithValue(r.Context(), tenantCtxKey, tid)
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}

// internal/platform/db/tx.go — toda transação seta o tenant
func (p *Pool) BeginTenant(ctx context.Context) (pgx.Tx, error) {
    tid, ok := ctx.Value(tenantCtxKey).(uuid.UUID)
    if !ok {
        return nil, ErrMissingTenant
    }
    tx, err := p.Begin(ctx)
    if err != nil {
        return nil, err
    }
    _, err = tx.Exec(ctx, "SET LOCAL app.current_tenant = $1", tid.String())
    if err != nil {
        _ = tx.Rollback(ctx)
        return nil, err
    }
    return tx, nil
}
```

**Tipo distinto para evitar erro de compilação ao misturar IDs:**
```go
type TenantID uuid.UUID
type ProgramID uuid.UUID
// Repository.GetProgram(ctx, TenantID, ProgramID) — não compila se trocar a ordem
```

### 3.4 Rotas que NÃO têm tenant

- `/r/:slug` (tracking público) — resolve `slug → partner → tenant` server-side
- `/auth/*` — login/registro
- `/admin/*` — SaaS owner area, usa **role**, não tenant (bypass de RLS via role Postgres `saas_admin`)
- `/webhooks/in/:provider/:secret` — extrai tenant do payload validado

### 3.5 Connection pooling

PgBouncer em **transaction mode**. `SET LOCAL` é seguro nesse modo (escopo é a transação). Conexão devolvida ao pool após `COMMIT/ROLLBACK`. Não usar `SET` global.

---

## 4. Motor de Regras

### 4.1 Decisão

**Regras armazenadas como JSONB versionado + interpretador Go.** Sem DSL custom no MVP (over-engineering). Sem expression engines genéricos tipo `expr-lang/expr` em primeiro momento — fechado a um conjunto declarativo de "blocos" combinados, evita injeção lógica e facilita UI.

**Snapshot de regra na indicação:** quando uma indicação é criada, snapshot da versão atual da regra é gravado no registro. Mudar a regra do programa **não** retroage em indicações abertas.

### 4.2 Schema da regra

```json
{
  "schema_version": 1,
  "trigger": "sale.confirmed",
  "attribution_window_days": 30,
  "conditions": [
    { "op": "eq", "field": "lead.status", "value": "closed" }
  ],
  "reward": {
    "type": "flexible_split",
    "max_pct": 20,
    "decision_by": "partner",
    "options": [
      { "commission_pct": 20, "discount_pct": 0 },
      { "commission_pct": 10, "discount_pct": 10 },
      { "commission_pct": 0,  "discount_pct": 20 },
      { "kind": "custom", "max_total_pct": 20 }
    ]
  },
  "payout": {
    "method": "pix",
    "schedule": "on_approval",
    "min_amount_brl": 50
  },
  "limits": {
    "max_per_partner_per_day": null,
    "max_total_payout_brl": null
  }
}
```

### 4.3 Tipos de `reward` (extensíveis)

| `type` | Significado | Campos |
|--------|-------------|--------|
| `commission_fixed` | Valor fixo por conversão | `amount_brl` |
| `commission_pct` | Percentual sobre `sale.amount` | `pct` |
| `discount_for_lead` | Desconto pro indicado | `pct` ou `amount_brl` |
| `flexible_split` | Parceiro escolhe split até `max_pct` | `max_pct`, `options[]`, `decision_by` |
| `goal_based` | Recompensa ao atingir `target` conversões | `target`, `reward`: { `kind`: "physical" \| "credit" \| "cashback", ... } |
| `points` | Pontos acumulados | `points_per_brl` ou `points_per_conversion` |
| `cashback` | Cashback ao próprio comprador | `pct` |
| `recurring_commission` | Comissão recorrente em assinaturas | `pct`, `max_months` |

Adicionar um tipo novo = (a) registrar um `RewardEvaluator` em Go, (b) adicionar opção no UI. Não muda o schema da tabela.

### 4.4 Como cada caso real é configurado

**Caso 1 — Wenox 20% flexível:**
```json
{ "reward": { "type": "flexible_split", "max_pct": 20, "decision_by": "partner",
  "options": [
    { "commission_pct": 20, "discount_pct": 0 },
    { "commission_pct": 10, "discount_pct": 10 },
    { "commission_pct": 0,  "discount_pct": 20 },
    { "kind": "custom", "max_total_pct": 20 }
  ]}
}
```
A escolha do split é guardada **por indicação** em `referrals.split_choice` (JSONB). Quando a venda fecha, o engine pega a escolha do parceiro (feita no momento da indicação ou definida como default do parceiro).

**Caso 2 — Ótica meta (5 indicações = óculos):**
```json
{ "reward": { "type": "goal_based", "target": 5,
  "counting": { "scope": "per_partner", "status_required": "closed" },
  "payout": { "kind": "physical", "sku": "oculos_modelo_x" }
}}
```
Worker `goal_evaluator` roda em todo `referral.status_changed_to_closed`, recalcula contadores por parceiro, emite `reward_earned` ao atingir target.

**Caso 3 — Ótica R$100 Pix:**
```json
{ "reward": { "type": "commission_fixed", "amount_brl": 100 },
  "payout": { "method": "pix", "schedule": "on_approval" }
}
```

### 4.5 Engine — pacote `internal/domain/rules`

```
rules/
├── schema.go        // structs do JSONB + JSON Schema validator
├── engine.go        // Evaluate(ctx, rule, event) (RewardOutcome, error)
├── conditions.go    // op eq/neq/gt/lt/in/between sobre eventos
├── evaluators/
│   ├── commission_fixed.go
│   ├── commission_pct.go
│   ├── flexible_split.go
│   ├── goal_based.go
│   └── ...
└── versioning.go    // migra v1 → v2 ao carregar (forward-compat)
```

**Loop de avaliação:**
```
event in (lead.created, lead.qualified, sale.confirmed, payment.confirmed)
    → carrega regra snapshot da indicação
    → checa condições (curto-circuito)
    → executa evaluator do tipo
    → emite RewardOutcome { partner_id, amount, kind, payout_method, status: "pending_approval" }
    → enfileira job de payout (após approval manual ou automático conforme regra)
```

### 4.6 Por que NÃO uma DSL custom no MVP

- Casos atuais cobertos por blocos declarativos.
- DSL exige parser, AST, sandboxing, testes de propriedade.
- Risco de regras com loops/expressões caras consumirem CPU em workers.
- Quando 2-3 clientes pedirem algo realmente fora do schema, avaliamos `expr-lang/expr` num campo específico (ex: `conditions_expr`), com timeout e whitelist de funções.

---

## 5. Tracking Engine

### 5.1 Fluxo técnico

```
[1] Parceiro Maria compartilha link: indica.ai/r/maria-x

[2] Click chega ao Cloudflare Worker
    ├─ lê cookie 1st-party _iaref (UUID visitor + slug do parceiro)
    │  └─ se não existe: gera UUIDv7 e seta cookie (1 ano, SameSite=Lax, Secure)
    ├─ extrai: IP (CF-Connecting-IP), UA, Accept-Language, Referer
    ├─ calcula fingerprint = sha256(ip_/24 + ua + accept_lang + tenant_id)
    ├─ POST async fire-and-forget para api/events/click:
    │     { slug, visitor_id, fingerprint, ip, ua, ref_query, ts }
    └─ resolve destino do programa (cacheado no Worker via KV):
       ├─ whatsapp: 302 → wa.me/55XXX?text=...+%20%20Código:%20MARIA-X
       ├─ site:     302 → https://cliente.com/?ref=maria-x
       └─ landing:  302 → indica.ai/p/programa-x?ref=maria-x

[3] API recebe POST /events/click
    ├─ valida slug → partner_id + tenant_id
    ├─ INSERT em click_events (tenant_id, program_id, partner_id, visitor_id,
    │                          fingerprint, ip, ua, ts, ref_query)
    └─ INCR contador Redis "clicks:program:{id}:today" (flush periódico ao DB)

[4a] Conversão via WhatsApp
     - Atendente cola o código MARIA-X no painel ou número é capturado por bot
     - POST /leads com { phone, code: "MARIA-X" }
     - Backend resolve code → partner_id, cria lead com partner_id

[4b] Conversão via Site/Form
     - Landing/site lê ?ref=maria-x e popula <input name="referral_code" value="maria-x">
     - Submit do form → POST /leads { ..., referral_code: "maria-x" }
     - Backend resolve code → partner_id

[4c] Conversão sem código (atribuição por cookie/fingerprint)
     - Visitante chega no site sem ?ref mas tem cookie _iaref
     - Widget JS no site posta { visitor_id, email, phone } pra api/leads
     - Backend busca último click_events por visitor_id ou fingerprint
       dentro de attribution_window_days do programa
     - Atribui ao partner mais recente

[5] Atribuição final (job River)
    - Trigger: lead.created OU sale.confirmed (depende do trigger da regra)
    - Job AttributeReferralJob:
       ├─ busca cliques candidatos (visitor_id, fingerprint, phone-hash, code)
       ├─ aplica modelo: "last touch dentro da janela" (default)
       ├─ deduplica: mesmo lead.phone_hash já atribuído? abort
       ├─ valida anti-fraude (ver §7.3)
       └─ INSERT em attributions(referral_id, partner_id, click_id, score, model)

[6] Cálculo de recompensa
    - sale.confirmed → engine de regras (§4) → reward.status = pending_approval
    - Após aprovação (auto ou manual) → enfileira PayoutJob
```

### 5.2 Estrutura de dados de tracking

```sql
-- particionar por mês quando volume crescer
CREATE TABLE click_events (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     uuid NOT NULL,
    program_id    uuid NOT NULL,
    partner_id    uuid NOT NULL,
    slug          text NOT NULL,
    visitor_id    uuid NOT NULL,
    fingerprint   text NOT NULL,
    ip_inet       inet,
    ua            text,
    accept_lang   text,
    referer       text,
    utm           jsonb,
    occurred_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX click_events_visitor_idx     ON click_events(visitor_id, occurred_at DESC);
CREATE INDEX click_events_fingerprint_idx ON click_events(fingerprint, occurred_at DESC);
CREATE INDEX click_events_partner_idx     ON click_events(partner_id, occurred_at DESC);
```

### 5.3 Cookie 1st-party (essencial)

- Nome: `_iaref`
- Conteúdo: `visitor_id:slug:ts:hmac` (assinado com chave do tenant para evitar forja)
- Domínio: domínio do cliente (`cliente.com`) quando widget JS é instalado, OU `indica.ai` quando o tráfego passa por nosso domínio
- Atributos: `Secure; HttpOnly=false; SameSite=Lax; Max-Age=31536000`
- **HttpOnly=false** porque o widget JS no site do cliente precisa ler — mitigado por HMAC, sem PII no cookie.

### 5.4 Fingerprint complementar

Não é fingerprint de browser invasivo. É um hash simples (`ip_/24 + ua + accept_lang`) que serve apenas como **fallback de baixa confiança** quando:
- cookie foi bloqueado/limpo
- não há código de referência

Pontuação de atribuição (`score`):
- `code_match`: 1.0
- `cookie_match`: 0.85
- `fingerprint_match`: 0.4
- Score < 0.5 → atribuição pendente de revisão manual no painel.

### 5.5 Prazo de atribuição

Campo `attribution_window_days` em cada programa. Job de atribuição filtra `occurred_at >= NOW() - INTERVAL '<window> days'`.

### 5.6 Deduplicação e anti-replay

- **Lead único por programa:** `UNIQUE (program_id, phone_e164_normalized)` ou `email_normalized`.
- **Click idempotente:** se mesmo `visitor_id` clica 10x em 1min, mantém o registro (importante para analytics) mas conta como 1 clique único para métricas via `COUNT(DISTINCT visitor_id)`.
- **Idempotency key em eventos do site do cliente:** header `Idempotency-Key`, cacheado em Redis 24h.

### 5.7 Integração com WhatsApp

Dois modos:

**Modo simples (MVP, manual):** Mensagem pré-preenchida com código (`Olá, vim pela indicação da Karine. Código: KARINE-8XK92A`). Atendente cola código no painel ao cadastrar lead.

**Modo automatizado (fase 2):** Webhook do WhatsApp Business API (via Z-API/Twilio) captura mensagens novas, regex extrai código, cria lead automaticamente em `status=new`. Atendente só qualifica.

---

## 6. Estrutura de Serviços/Módulos Go

### 6.1 Decisão

**Monólito modular.** Um único repositório, três binários distintos (`api`, `worker`, `tracker`), domínios isolados em pacotes Go com fronteiras estritas.

**Por que não microserviços agora:**
- Time pequeno; latência de rede entre serviços vira gargalo de produtividade.
- Transações cross-service exigem sagas; transações Postgres ainda resolvem tudo.
- River queue + Cloudflare Worker já fornecem o desacoplamento que importa.
- Mover um pacote para serviço próprio mais tarde é refatoração contida se as fronteiras forem respeitadas.

**Quando dividir:**
- Tracker em Cloudflare Worker já é um "serviço" separado de fato.
- Se um domínio (ex: `payouts`) crescer e precisar deploy independente / SLA distinto.

### 6.2 Estrutura de pastas

```
indica-ai/
├── cmd/
│   ├── api/main.go              # binário HTTP (Fly.io)
│   ├── worker/main.go           # binário River workers (Fly.io)
│   ├── migrate/main.go          # CLI de migrations
│   └── seed/main.go             # seed para dev/staging
│
├── internal/
│   ├── domain/                  # entidades + regras de negócio puras (sem deps HTTP/DB)
│   │   ├── tenant/              # Tenant, Plan
│   │   ├── identity/            # User, Role, Session, Auth
│   │   ├── program/             # Program, ProgramStatus
│   │   ├── rules/               # RuleSchema, Engine, Evaluators
│   │   ├── partner/             # Partner, PartnerLink
│   │   ├── referral/            # Referral, Attribution
│   │   ├── lead/                # Lead, LeadStatus, LeadStateMachine
│   │   ├── sale/                # Sale, SaleAmount
│   │   ├── reward/              # Reward, RewardStatus
│   │   ├── payout/              # Payout, PayoutMethod (Pix, manual, etc)
│   │   ├── tracking/            # ClickEvent, VisitorID, Fingerprint
│   │   └── billing/             # Subscription, Invoice (do SaaS pros clientes)
│   │
│   ├── platform/                # adapters/infra (depend on libs externas)
│   │   ├── db/                  # pgx pool, tenant-scoped tx, sqlc gerado
│   │   ├── cache/               # rueidis wrapper
│   │   ├── queue/               # river client + workers registry
│   │   ├── http/                # chi router base, middlewares
│   │   ├── auth/                # JWT, argon2, refresh tokens
│   │   ├── observability/       # slog, prometheus, otel
│   │   ├── config/              # env loader
│   │   ├── pix/                 # Asaas client
│   │   ├── email/               # Resend client
│   │   ├── whatsapp/            # Z-API/Twilio client
│   │   └── storage/             # R2 client
│   │
│   ├── api/                     # camada HTTP
│   │   ├── handlers/            # 1 subpacote por domínio (programs/, partners/, leads/, ...)
│   │   ├── middleware/          # tenant, auth, rate limit, request_id, recover
│   │   ├── dto/                 # request/response (separado das entidades de domínio)
│   │   └── routes.go            # registro de rotas
│   │
│   ├── workers/                 # jobs River
│   │   ├── attribution/         # AttributeReferralJob
│   │   ├── rewards/             # EvaluateRulesJob, GoalRecalcJob
│   │   ├── payouts/             # PayoutPixJob, PayoutRetryJob
│   │   ├── notifications/       # SendEmailJob, SendWhatsAppJob
│   │   ├── webhooks/            # DeliverWebhookJob (com retry exponencial)
│   │   └── lgpd/                # ExportDataJob, EraseDataJob
│   │
│   └── tracker/                 # handlers do tracking edge (compartilhados com Worker)
│       ├── click.go             # POST /events/click
│       └── resolve.go           # GET /r/:slug fallback
│
├── db/
│   ├── migrations/              # *.up.sql / *.down.sql (golang-migrate)
│   └── queries/                 # *.sql (input do sqlc)
│
├── workers-edge/                # Cloudflare Worker (TypeScript)
│   └── tracker/
│
├── web/                         # Next.js 15 (monorepo via pnpm workspace)
│   ├── apps/
│   │   ├── dashboard/           # app empresa
│   │   ├── partner/             # app parceiro
│   │   └── public/              # landings + widget
│   └── packages/
│       ├── ui/                  # shadcn/ui components
│       ├── api-client/          # cliente TS gerado da OpenAPI
│       └── tracking/            # widget JS embarcável no site do cliente
│
├── deploy/
│   ├── fly/                     # fly.toml, Dockerfile
│   ├── terraform/               # infra-as-code
│   └── cloudflare/              # wrangler.toml
│
├── docs/
│   ├── product-spec.md
│   └── architecture.md          # este documento
│
├── .github/workflows/           # CI
├── sqlc.yaml
├── go.mod
└── Makefile
```

### 6.3 Regras de fronteira entre pacotes

- `internal/domain/*` **não importa** `internal/platform/*` nem libs externas (exceto stdlib + types puros). Define **interfaces** que `platform` implementa.
- `internal/platform/*` **pode importar** `internal/domain/*` (implementa repositórios).
- `internal/api/handlers/*` orquestra: chama `platform/db` para abrir tx, passa para use-case do `domain`.
- Dependências verificadas em CI via `go-arch-lint` ou `import-boss`.

### 6.4 Por que `domain/` antes de `platform/`

Não é DDD canônico — é separação prática que permite:
- Testar regras de negócio sem subir Postgres
- Trocar Asaas por Stripe sem mudar `domain/payout`
- Engine de regras é matematicamente puro e fácil de testar

---

## 7. Decisões de Segurança Fundamentais

### 7.1 Autenticação e Sessão

| Persona | Mecanismo | Tokens |
|---------|-----------|--------|
| **Tenant admin** (empresa) | Email/senha (Argon2id) + 2FA TOTP opcional | JWT access (15min) em cookie HttpOnly + refresh rotativo (30d) em cookie HttpOnly. Rotation = invalidação do anterior, detecção de uso duplicado = revogação total. |
| **Partner** (parceiro) | **Magic link** (link assinado válido 15min) — baixa fricção | Mesmo modelo JWT + refresh, escopo limitado |
| **SaaS owner** (admin) | Email/senha + **TOTP obrigatório** | JWT com `role: saas_admin` + escopo de bypass de RLS |
| **API externa** (cliente integra via webhook) | API key (32 bytes) + HMAC-SHA256 do payload | Key armazenada como hash Argon2id no DB |

**JWT signing:** HS256 com chave rotacionável (kid no header). Refresh token armazenado em DB (`refresh_tokens` com `jti`, `family_id` para detectar rotation theft).

**Cookies:** `HttpOnly; Secure; SameSite=Lax; Path=/`. Subdomínio `app.indica.ai` para dashboards (cookies isolados de `r.indica.ai` para tracking).

### 7.2 Isolamento de Tenant no Código

- **Middleware obrigatório `TenantInjector`** em todo grupo de rotas autenticadas (`/api/*`). Ausência = 401.
- **Tipo `TenantID` distinto de `uuid.UUID`** força mistura a falhar na compilação.
- **`pool.BeginTenant(ctx)`** é a **única forma** de abrir transação — wrapper bloqueia `pool.Begin()` direto via lint rule (revisar PR ou usar `go-arch-lint`).
- **RLS no Postgres é a segunda barreira.** Mesmo se um bug no Go esquecer um filtro, o DB recusa.
- **Testes de integração** que tentam acessar dados de outro tenant **devem falhar** — suite obrigatória.

### 7.3 Anti-Fraude

| Ameaça | Mitigação |
|--------|-----------|
| **Auto-referral** (parceiro indica a si mesmo) | Hash do telefone/email do parceiro batido contra `lead.contact_hash` — match bloqueia. Também: hash IP/24 + UA do clique vs conversão = mesmo "dispositivo" → flag manual. |
| **Click farm** (cliques inflados) | Rate limit por IP no edge Worker (300/min). Análise periódica: ratio `clicks_unique_visitors / clicks_total < 0.1` em janela = alerta. |
| **Lead duplicado** | `UNIQUE (program_id, phone_e164_normalized)`. Soft-match por email normalizado em job assíncrono. |
| **Manipulação de regras** | Snapshot da regra no momento da indicação. Editar regra não afeta indicações em curso. |
| **Brute force login** | Rate limit por IP+email (Redis token bucket). 5 falhas em 15min = captcha; 15 = bloqueio temporário. |
| **Enumeração de slug** | `/r/:slug` retorna 302 para landing genérica (não 404), evita enumeração. Slugs longos (8+ chars) por padrão. |
| **Webhooks forjados** | HMAC obrigatório em webhooks recebidos. Idempotency-Key obrigatório em `POST /leads` externos. |

### 7.4 Rate Limiting (Redis token bucket via Lua)

| Endpoint | Limite |
|----------|--------|
| `GET /r/:slug` (edge Worker) | 300 req/min por IP |
| `POST /events/*` | 1000 req/min por tenant (autenticado por origin) |
| `POST /auth/login` | 10 req/min por IP+email |
| `POST /leads` (API pública do cliente) | 60 req/min por API key |
| Demais rotas autenticadas | 600 req/min por user |

### 7.5 Proteção de Webhooks Emitidos

- HMAC-SHA256 do body com **secret por endpoint** (configurado pela empresa cliente).
- Header `X-Indica-Signature: t=<timestamp>,v1=<hex>`.
- Body inclui `event_id` (UUID) e `attempt` para idempotência no consumidor.
- Retry exponencial: 1m, 5m, 30m, 2h, 12h, 24h (6 tentativas), depois dead-letter visível no painel.
- Dashboard de webhook delivery com replay manual.

### 7.6 LGPD (compliance desde dia 1)

- **Consentimento explícito** no submit de qualquer formulário: texto da política aceita armazenado em `consents(user_id, policy_version, accepted_at, ip)`.
- **Endpoint `GET /me/export`** (autenticado pelo titular ou via solicitação validada por email) → enfileira `ExportDataJob` → entrega ZIP no R2 com link assinado válido 7 dias.
- **Endpoint `POST /me/erase`** → enfileira `EraseDataJob`: anonymiza PII em `users`, `leads`, `partners`, `click_events` (mantém agregados sem PII para integridade fiscal/contábil), invalida sessões.
- **Tabela `audit_log`** registra leitura de PII em massa (export, dashboards admin).
- **Encriptação at-rest** garantida pelo provider managed (Fly.io Postgres / Neon). TLS sempre.
- **Retenção:** `click_events` agregados após 12 meses, PII de leads 5 anos (limite fiscal), refresh tokens revogados deletados após 30 dias.
- **DPO/contato:** endpoint `/lgpd/contact` na landing pública.

### 7.7 Defesa em Profundidade

- WAF Cloudflare na frente de tudo (regras gratuitas básicas + custom rate limit).
- CSP estrita no frontend (`script-src 'self' vercel.live`).
- `X-Frame-Options: DENY` exceto no widget embed (permite frame-ancestors do tenant configurado).
- Dependabot + `govulncheck` no CI.
- Secret scanning no GitHub.
- Logs de auditoria imutáveis (append-only) em tabela própria.

---

## Anexo A — Decisões Diferidas (registrar agora, decidir depois)

| Tema | Quando reavaliar | Trigger |
|------|------------------|---------|
| Mover tracking edge para serviço Go próprio | >1M cliques/dia | Latência ou custo Worker |
| Sharding por tenant_id ou Citus | >500GB no Postgres | Tempo de migration > 30min |
| ElasticSearch/Typesense para busca | Busca em leads >100k registros/tenant | Latência de FTS Postgres > 300ms |
| Microserviço de payouts | >100k payouts/mês | SLA de pagamento distinto |
| Substituir River por Asynq | >500 jobs/seg sustentados | Throughput não atingido |
| OpenFGA para autorização fina | Multi-equipe dentro de tenant | Hierarquia de permissões complexa |

---

## Anexo B — Checklist para o `@backend-chief` e `@db-chief`

- [ ] Iniciar repositório Go com a estrutura de pastas §6.2
- [ ] Configurar `sqlc` + `migrate` + `river`
- [ ] Implementar `platform/db.BeginTenant` (§3.3) e proibir `Begin` direto via lint
- [ ] Primeira migration: `tenants`, `users`, `programs` com RLS ativado
- [ ] Middleware `TenantInjector` em rotas autenticadas
- [ ] Testes de integração que provam isolamento entre tenants (suite "fortress")
- [ ] CI: `go test`, `go vet`, `golangci-lint`, `govulncheck`, `go-arch-lint`

---

*Próxima etapa: **ETAPA 3 — Modelagem de Banco de Dados** (`@db-chief`)*
*Dependência: este documento deve ser lido pelo `@db-chief` antes de iniciar o schema — especialmente §3 (multi-tenancy), §4 (motor de regras/JSONB) e §5 (tracking engine / estrutura de click_events).*
