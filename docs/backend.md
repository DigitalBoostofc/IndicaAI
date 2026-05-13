# Backend — Indica AÍ!

## Visão Geral

Backend em Go 1.24+ seguindo arquitetura clean architecture com 3 camadas:
- **Platform** — infraestrutura (DB, cache, auth, HTTP, observabilidade)
- **Domain** — regras de negócio (rules engine, entidades, tipos)
- **API** — handlers HTTP, middleware, DTOs
- **Workers** — jobs assíncronos (atribuição, recompensas, pagamentos, LGPD)

## Stack

| Componente | Tecnologia |
|-----------|------------|
| Language | Go 1.24+ |
| HTTP Router | chi v5 |
| Database | PostgreSQL 16 (pgx/v5) |
| Cache/Queue | Redis 7 (rueidis) |
| Auth | JWT HS256 + Argon2id (OWASP) |
| Migrations | golang-migrate |
| Observability | slog + Prometheus + OTel |
| Queue (stub) | River (síncrono no MVP) |

## Estrutura de Diretórios

```
cmd/
├── api/           # Servidor HTTP principal
├── worker/        # Processador de jobs assíncronos
├── migrate/       # CLI de migrations
└── seed/          # Dados demo (Wenox, Karine)

internal/
├── api/
│   ├── dto/       # Request/Response types
│   ├── handlers/
│   │   ├── auth/      # Register, Login, Refresh, Logout
│   │   ├── programs/  # CRUD programas
│   │   └── tracking/  # Click events, redirect
│   ├── middleware/
│   │   ├── auth.go    # JWT validation, role check
│   │   ├── tenant.go  # Tenant injection from JWT
│   │   └── ratelimit.go # Redis token bucket
│   └── routes.go
├── domain/
│   ├── rules/     # Engine + 8 evaluators
│   ├── types.go   # Strongly typed IDs, status machines
│   ├── lead/
│   ├── partner/
│   ├── referral/
│   └── tracking/
├── platform/
│   ├── auth/      # JWT, password (argon2id), magic link
│   ├── cache/     # Redis client + rate limit Lua
│   ├── config/    # env parsing (caarlos0/env)
│   ├── db/        # pgxpool + BeginTenant (RLS)
│   ├── email/     # Stub client
│   ├── http/      # chi router factory
│   ├── observability/ # slog config
│   ├── pix/       # Stub client
│   ├── queue/     # Stub queue (River)
│   ├── storage/   # Stub client (R2/S3)
│   └── whatsapp/  # Stub client
└── workers/
    ├── attribution/ # Anti-fraud + scoring + rule evaluation
    ├── lgpd/        # Export, erase, retention sweep
    ├── payouts/     # Pix transfers + retry
    └── webhooks/    # HMAC delivery + retry
```

## Como Rodar

### Pré-requisitos

- Go 1.24+
- Docker (para Postgres + Redis)
- golang-migrate CLI

### Setup

```bash
# 1. Subir infra
docker-compose up -d

# 2. Copiar .env
cp .env.example .env

# 3. Rodar migrations
make migrate-up

# 4. Seed dados demo
make seed

# 5. Rodar API
make dev

# 6. Rodar tests
make test
```

### Variáveis de Ambiente

| Variável | Default | Descrição |
|----------|---------|-----------|
| `DATABASE_URL` | `postgres://indica:indica@localhost:5432/indica?sslmode=disable` | Postgres connection string |
| `REDIS_URL` | `redis://localhost:6379/0` | Redis connection string |
| `JWT_SECRET` | (obrigatório) | Min 32 chars para HS256 |
| `HTTP_ADDR` | `:8080` | Endereço do servidor |
| `ACCESS_EXPIRY` | `15m` | TTL do access token |
| `REFRESH_EXPIRY` | `720h` | TTL do refresh token (30 dias) |
| `RATE_LIMIT_RPM` | `600` | Requests por minuto por tenant |
| `LOG_LEVEL` | `info` | Nível de log (debug, info, warn, error) |
| `LOG_FORMAT` | `json` | Formato (json, text) |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | (opcional) | Endpoint OTel collector |

## Endpoints

### Públicos (sem auth)

| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/auth/register` | Registro de usuário |
| `POST` | `/auth/login` | Login (retorna cookies HttpOnly) |
| `POST` | `/auth/refresh` | Renova access token |
| `POST` | `/auth/logout` | Revoga refresh token |
| `POST` | `/events/click` | Track click público (idempotente) |
| `GET` | `/r/:slug` | Redirect 302 (WhatsApp/site) |
| `GET` | `/healthz` | Health check |

### Autenticados (JWT + tenant)

| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/programs` | Criar programa |
| `GET` | `/programs` | Listar programas |
| `GET` | `/programs/:id` | Buscar programa |
| `GET` | `/partners` | Listar parceiros (stub) |
| `GET` | `/leads` | Listar leads (stub) |
| `GET` | `/rewards` | Listar recompensas (stub) |
| `POST` | `/me/export` | Solicitar export LGPD |
| `POST` | `/me/erase` | Solicitar anonimização LGPD |

### Admin (role=saas_admin)

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/admin/tenants` | Listar tenants |

## Rules Engine

O motor de regras suporta 8 tipos de recompensa:

| Tipo | Descrição | Campos obrigatórios |
|------|-----------|---------------------|
| `commission_fixed` | Comissão fixa em BRL | `amount_brl` |
| `commission_pct` | Comissão percentual | `pct` |
| `flexible_split` | Split flexível (comissão vs desconto) | `max_pct`, `options` |
| `goal_based` | Recompensa por meta | `target` |
| `points` | Sistema de pontos | `points_per_brl` ou `points_per_conversion` |
| `cashback` | Cashback percentual | `pct` |
| `recurring_commission` | Comissão recorrente | `pct`, `max_months` |
| `discount_for_lead` | Desconto para o indicado | (nenhum extra) |

### Schema JSON

```json
{
  "schema_version": 1,
  "trigger": "sale.confirmed",
  "attribution_window_days": 30,
  "conditions": [
    {"op": "eq", "field": "lead.status", "value": "closed"}
  ],
  "reward": {
    "type": "commission_pct",
    "pct": 10
  },
  "counting": {
    "mode": "unique",
    "period_days": 30
  },
  "payout": {
    "method": "pix",
    "auto": true,
    "min_amount_brl": 50
  },
  "limits": {
    "max_rewards_per_referral": 1,
    "max_total_brl": 10000
  }
}
```

### Adicionar novo evaluator

1. Implementar interface `Evaluator` em `internal/domain/rules/evaluators.go`:
```go
type Evaluator interface {
    Evaluate(rule *RuleSchema, event *Event) (*Outcome, error)
}
```

2. Registrar em `NewEngine()`:
```go
e.evaluators["my_new_type"] = &MyNewEvaluator{}
```

3. Adicionar testes em `engine_test.go`

## Autenticação

- **JWT HS256** com access token (15min) + refresh token (30 dias)
- Tokens em cookies **HttpOnly + Secure + SameSite=Lax** (nunca no body)
- **Refresh rotation** com family_id para detecção de roubo
- **Argon2id** OWASP para senhas (64MB, 3 iter, 4 parallel)
- **Magic link** para login sem senha (gera token criptográfico)

## Multi-Tenancy

Cada empresa cliente é um **tenant** isolado via:
- `tenant_id UUID NOT NULL` em todas as tabelas
- PostgreSQL RLS com `SET LOCAL app.current_tenant`
- Middleware `TenantInjector` extrai tenant do JWT
- **Único jeito de iniciar transação**: `pool.BeginTenant(ctx)`

## Anti-Fraude

O worker de atribuição (`internal/workers/attribution/`) implementa:

1. **Auto-referral detection**: compara phone_hash do parceiro com o lead
2. **Click farm detection**: ratio unique_visitors/total_clicks < 0.1 = flag
3. **Attribution scoring**:
   - Code match: 1.0 (confiança máxima)
   - Cookie/visitor_id: 0.85
   - Fingerprint: 0.4
   - Score < 0.5 → review manual

## LGPD Compliance

- `POST /me/export` — exporta dados do usuário (art. 18, I)
- `POST /me/erase` — anonimiza dados (art. 18, IV)
- **Retention sweep** diário:
  - click_events: IP/UA anonimizados após 12 meses
  - refresh_tokens: deletados 30 dias após revogação
  - idempotency_keys: deletados após expirar

## Workers Assíncronos

| Worker | Trigger | Descrição |
|--------|---------|-----------|
| Attribution | click/lead | Anti-fraud + scoring + rule evaluation |
| Rewards | sale.confirmed | Avalia regras e cria reward |
| Payouts | reward.approved | Transfere Pix com retry exponencial |
| LGPD | user request | Export/erase + retention sweep |
| Webhooks | event | HMAC delivery + retry |

### Retry (Payouts)

Backoff exponencial: 1m → 5m → 30m → 2h → 12h → 24h

### Webhooks

Assinatura HMAC-SHA256:
```
X-Indica-Signature: t=<timestamp>,v1=<hex>
```

## Testes

```bash
# Unit tests (rules engine, auth, domain)
make test-unit

# Integration tests (RLS fortress)
DATABASE_URL_TEST=... make test-integration

# E2E happy path
DATABASE_URL_TEST=... go test ./test/e2e/...

# All
make test
```

### Cobertura mínima obrigatória

- Rules engine + 8 evaluators ✅
- Fortress RLS (tenant isolation) ✅
- 1 E2E happy path ✅

## Próximos Passos (Fase 2)

- [ ] Substituir stubs (pix, email, whatsapp, storage) por clientes reais
- [ ] Implementar handlers completos (partners, leads, rewards, payouts)
- [ ] Gerar código sqlc para type-safe queries
- [ ] Adicionar rate limiting por IP nos endpoints públicos
- [ ] Implementar webhooks outbound com retry
- [ ] Dashboard metrics endpoints
- [ ] Cloudflare Workers para edge tracking
