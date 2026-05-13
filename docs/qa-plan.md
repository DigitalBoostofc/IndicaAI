# Indica AÍ! — Plano de QA (ETAPA 9)

> Documento produzido por @qa-chief | 2026-05-13
> Dependências lidas: `docs/product-spec.md`, `docs/architecture.md`, `docs/backend.md`, `docs/security-antifraud.md`
> Consumidores: `@backend-chief` (tickets QA-XX), `@devops-chief` (CI/CD)

---

## 1. Test Pyramid e Cobertura Alvo

### 1.1 Pirâmide

```
        ╱  E2E  ╲          ~5 cenários críticos
       ╱──────────╲
      ╱ Integration ╲       ~20 testes (DB + HTTP)
     ╱────────────────╲
    ╱    Unit Tests     ╲    ~80+ testes (domínio, handlers, utils)
   ╱──────────────────────╲
```

### 1.2 Metas de cobertura por pacote

| Pacote | Cobertura alvo | Justificativa |
|--------|---------------|---------------|
| `internal/domain/fraud` | ≥90% | Motor anti-fraude é safety-critical; cada regra precisa de teste |
| `internal/domain/rules` | ≥85% | Engine de regras é o core do produto |
| `internal/domain/types` | ≥80% | Status machines e IDs tipados |
| `internal/platform/auth` | ≥80% | JWT + password hashing = superfície de ataque |
| `internal/platform/db` | ≥70% | RLS + BeginTenant críticos |
| `internal/api/handlers/*` | ≥70% | Handlers HTTP — cobertura de happy path + error paths |
| `internal/workers/*` | ≥70% | Jobs assíncronos — payouts, attribution |
| `internal/api/middleware` | ≥60% | Auth + rate limit |

**Cobertura geral alvo: ≥65%** (realista para MVP com stubs externos).

---

## 2. Matriz de Cobertura por Feature

| Feature | Unit | Integration | E2E | Tooling | Prioridade |
|---------|------|-------------|-----|---------|-----------|
| **Auth (login + magic-link)** | JWT sign/verify, password hash, token expiry | Login flow HTTP, magic-link verify | Login → create program | `httptest`, `auth` pkg | 🔴 P0 |
| **Programs CRUD** | Rules engine evaluation | Create/Read/Update via HTTP | — | `httptest` | 🟡 P1 |
| **Partners (me + referrals + createLead)** | Self-referral check, validation | CreateLead HTTP, wallet query | Partner → lead → referral | `httptest`, pgxmock | 🔴 P0 |
| **Payouts (admin lifecycle)** | groupByPartner, ValidatePixKey | Confirm/Paid/Cancel HTTP | Full payout flow | `httptest` | 🔴 P0 |
| **Wallet** | Balance calculation | Wallet query via HTTP | — | `httptest` | 🟡 P1 |
| **Fraud detection** | Engine score+action per signal | Self-referral blocking | — | `mockQuerier` | 🔴 P0 |
| **Tracking redirect** | Slug resolution | Click event HTTP | Click → redirect | `httptest` | 🟡 P1 |
| **RLS isolation** | — | Cross-tenant queries return 0 rows | — | `pgxpool` + real DB | 🔴 P0 |
| **Rate limiting** | Token bucket logic | Rate limit triggers 429 | — | `httptest` + Redis | 🟡 P1 |
| **LGPD (export/erase)** | — | Erase preserves fiscal data | — | pgxpool | 🟢 P2 |

---

## 3. Ferramentas

### 3.1 Test framework
**`testing` stdlib + `stretch/testify`** — já em uso no projeto. Manter.

### 3.2 DB testing: docker-compose (NÃO testcontainers)

**Decisão: docker-compose service para testes de integração.**

Justificativa:
- O projeto já tem `docker-compose.yml` com Postgres 16 + Redis 7 prontos
- Testcontainers-go adiciona ~30s de startup por teste e complexidade de configuração
- Em CI (GitHub Actions), o docker-compose já está disponível via `services:` ou `docker compose up`
- Testes de integração usam `DATABASE_URL_TEST` env var + `t.Skip()` quando DB indisponível
- Trade-off aceito: testes de integração rodam apenas quando DB está up (documentado no Makefile)

**Quando migrar para testcontainers:** quando houver necessidade de rodar testes de integração em paralelo com schemas isolados (multi-tenant tests com RLS precisam de isolamento por teste). Atualmente, testes sequenciais com cleanup via `t.Cleanup` são suficientes.

### 3.3 HTTP testing
**`net/http/httptest`** — já em uso. `httptest.NewRequest` + `httptest.NewRecorder` + `chi.Router`.

### 3.4 Mocks
- **`pgxmock`** NÃO será usado — o projeto já tem padrão de `mockQuerier` caseiro (ver `internal/domain/fraud/engine_test.go`). Manter consistência.
- Para handlers que dependem de `pgxpool`, usar DB real (integration) ou `nil` pool (unit test de validação).

### 3.5 Coverage report
```bash
go test ./... -cover -coverprofile=coverage.out -covermode=atomic
go tool cover -html=coverage.out -o coverage.html
go tool cover -func=coverage.out | tail -1  # total
```

### 3.6 Load testing (futuro)
**k6** — melhor integração com CI, scripts em JS, métricas nativas para Grafana.
Vegeta como alternativa para benchmarks Go nativos.

---

## 4. CI/CD Integration

### 4.1 Pipeline de testes

```yaml
# Sequência proposta (GitHub Actions)
steps:
  - name: Lint
    run: golangci-lint run ./...

  - name: Vet
    run: go vet ./...

  - name: Unit tests (rápidos, sem DB)
    run: go test ./internal/... -short -count=1 -v

  - name: Start DB
    run: docker compose up -d postgres redis && sleep 5

  - name: Run migrations
    run: make migrate-up
    env:
      DATABASE_URL: postgres://indica:indica_dev_2024@localhost:5432/indica_ai

  - name: Integration tests (precisam de DB)
    run: go test ./test/... -v -count=1
    env:
      DATABASE_URL_TEST: postgres://indica:indica_dev_2024@localhost:5432/indica_ai

  - name: Coverage report
    run: go test ./... -coverprofile=coverage.out -covermode=atomic
```

### 4.2 O que quebra o build

| Categoria | Quebra build? | Justificativa |
|-----------|--------------|---------------|
| Unit tests | ✅ Sempre | Rápidos, determinísticos |
| Integration tests | ✅ Quando DB disponível | Em CI, DB sempre está up |
| E2E tests | ✅ Quando DB disponível | Mesmo que integration |
| Load tests | ❌ Não | Rodam em job separado, manual ou noturno |

### 4.3 Fixtures e migrations de teste

- **Migrations:** usar as mesmas migrations de produção (`db/migrations/`). Nenhuma migration de teste separada.
- **Seed de teste:** cada teste faz seu próprio setup via SQL direto + `t.Cleanup()` para teardown. Sem fixture compartilhada (evita acoplamento entre testes).
- **Dados sensíveis:** nenhum dado real em fixtures. Usar emails como `test-{uuid}@test.com`.

---

## 5. Tickets QA Priorizados

### 🔴 P0 — Bloqueantes para go-live

| # | Título | Arquivo destino | Estimativa | Dependência |
|---|--------|----------------|-----------|-------------|
| **QA-01** | RLS isolation: tenant A não lê dados de tenant B | `test/integration/rls_isolation_test.go` | 3h | SEC-01 (BeginTenant) |
| **QA-02** | E2E happy path: programa → parceiro → lead → reward → payout | `test/e2e/referral_flow_test.go` | 4h | Nenhuma |
| **QA-03** | Self-referral bloqueado: phone_hash match → 422 + audit | `test/integration/fraud_self_referral_test.go` | 3h | SEC-08 |
| **QA-04** | Auth: login sucesso/fracasso, token expiry, refresh | `internal/api/handlers/auth/handler_test.go` | 4h | Nenhuma |
| **QA-05** | Payout lifecycle: confirm → paid → cancel (HTTP) | `internal/api/handlers/payouts/handler_http_test.go` | 3h | Nenhuma |
| **QA-06** | Admin endpoint: user normal não acessa /admin/tenants | `test/integration/admin_auth_test.go` | 2h | Nenhuma |

### 🟡 P1 — Importantes para go-live completo

| # | Título | Arquivo destino | Estimativa | Dependência |
|---|--------|----------------|-----------|-------------|
| **QA-07** | Fraud engine: todos os sinais isolados + combinados | `internal/domain/fraud/engine_test.go` | 2h | Já parcialmente feito |
| **QA-08** | Rules engine: cada tipo de regra avaliado corretamente | `internal/domain/rules/engine_test.go` | 3h | Nenhuma |
| **QA-09** | Partner wallet: saldo correto após rewards pagos | `internal/api/handlers/me/handler_test.go` | 2h | Nenhuma |
| **QA-10** | Rate limit: 429 após burst + fail-closed em erro Redis | `internal/api/middleware/ratelimit_test.go` | 3h | SEC-04 |
| **QA-11** | Tracking: click event registrado + redirect funciona | `internal/api/handlers/tracking/handler_test.go` | 2h | Nenhuma |
| **QA-12** | ValidatePixKey: todos os tipos (CPF, CNPJ, email, phone, random) | `internal/api/handlers/payouts/handler_test.go` | 1h | Já feito |

### 🟢 P2 — Pós-launch

| # | Título | Arquivo destino | Estimativa | Dependência |
|---|--------|----------------|-----------|-------------|
| **QA-13** | LGPD erase: dados fiscais preservados, PII anonimizado | `test/integration/lgpd_erase_test.go` | 3h | Nenhuma |
| **QA-14** | CORS: origin inválida não recebe credenciais | `test/integration/cors_test.go` | 2h | Nenhuma |
| **QA-15** | Slug enumeration: inexistente redirect genérico + rate limit | `test/integration/tracking_enumeration_test.go` | 2h | Nenhuma |

---

## 6. Estrutura de Diretórios de Teste

```
internal/
├── domain/
│   ├── fraud/engine_test.go          ✅ existe (12 testes)
│   ├── rules/engine_test.go          ✅ existe
│   └── types_test.go                 ✅ existe
├── platform/
│   ├── auth/jwt_test.go              ✅ existe
│   ├── auth/password_test.go         ✅ existe
│   ├── config/config_test.go         ✅ existe
│   └── db/rls_fortress_test.go       ✅ existe (será expandido por QA-01)
├── api/handlers/
│   ├── payouts/handler_test.go       ✅ existe
│   ├── payouts/handler_http_test.go  ✅ existe
│   └── partners/handler_test.go      ✅ existe
└── workers/
    └── payouts/create_payouts_job_test.go  ✅ existe

test/
├── e2e/
│   └── happy_path_test.go            ✅ existe (será substituído por QA-02)
└── integration/
    ├── rls_isolation_test.go         ← QA-01 (NOVO)
    └── fraud_self_referral_test.go   ← QA-03 (NOVO)
```
