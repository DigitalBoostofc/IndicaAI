# Indica AÍ! — DevOps & Deploy (ETAPA 10)

> Documento produzido por @devops-chief | 2026-05-13
> Dependências lidas: `docs/architecture.md`, `docs/backend.md`, `docs/qa-plan.md`, `docs/security-antifraud.md`, `docs/payments-compliance.md`
> Consumidores: qualquer engenheiro executando deploy, CI, ou provisionamento de infra.

---

## 1. Decisão de Plataformas

### 1.1 Tabela de decisões

| Camada | Opções Avaliadas | Decisão | Justificativa |
|--------|-----------------|---------|---------------|
| **Frontend (3 Next.js apps)** | Vercel, Cloudflare Pages, self-host | **Vercel** | Commit "Vercel prep" já preparou o repo; otimização nativa Next.js 15; ISR sem config extra; edge middleware para tracking; preview per-PR gratuito. Trade-off: custo escala com uso, mas irrelevante no MVP. |
| **Backend Go (api + worker)** | Fly.io, Railway, Render, GCP Cloud Run, AWS ECS Fargate | **Fly.io (região GRU)** | Deploy Docker direto; região `gru` (São Paulo) real; IPs dedicados; máquinas param quando sem tráfego (billing por segundo); Postgres managed colocado; fly.toml é IaC suficiente para MVP. Cloud Run seria <$5/mês a mais, mas exigiria Artifact Registry + GCP org. Railway não tem GRU. |
| **Postgres** | Supabase, Neon, Railway PG, Fly Postgres, AWS RDS | **Fly.io Postgres** | Zero-distance da API (mesma rede privada Fly); sem cold start; `fly postgres connect` para acesso; replicação read-only configurável; backup PITR incluso. Neon seria preferível se preview envs por PR fossem prioridade — reavalie quando time crescer. |
| **Redis** | Upstash, Redis Cloud, Fly Redis | **Upstash Redis** | Free tier generoso (10k req/dia, 256MB); REST API + Redis protocol; sem máquina permanente; faturamento por request (previsível em baixo volume); região `sa-east-1` disponível. Fly Redis exige máquina persistente ($6/mês sempre). |
| **Tracking edge** | Cloudflare Workers, Vercel Edge | **Cloudflare Workers** | Já decidido em `architecture.md`: V8 isolates <50ms global, KV para cache de slugs, `workers-edge/tracker/` já existe no repo. |
| **Object storage** | Cloudflare R2, AWS S3, GCS | **Cloudflare R2** | Já decidido em `architecture.md`/`config.go`: zero egress fee; S3-compatible; integra com Workers sem latência; exportações LGPD e brindes não incorrem em custo de download. |
| **Email transacional** | Resend, SES, SendGrid, Postmark | **Resend** | Já configurado em `.env.example`; SDK Go oficial; 3k emails/mês gratuitos; interface limpa; melhor DX para devs. SES seria $0.10/1k mas requer AWS org e DNS verification burocrático. |
| **DNS + WAF** | Cloudflare | **Cloudflare** | Free tier: DNS autoritativo, WAF básico com regras community, DDoS protection, rate limiting no edge — já na arquitetura. |
| **Observability** | Grafana Cloud, Datadog, OTel self-host, Better Stack | **Grafana Cloud (free) + Better Stack (Logtail)** | Grafana Cloud: 10k series Prometheus + Tempo traces (OTel nativo) + 50GB Loki gratuito. Better Stack: logs structurados em SQL, status page público, free tier 1GB/mês. Datadog seria ~$80/mês já no MVP. |
| **Errors** | Sentry, Rollbar, Bugsnag | **Sentry** | Free tier 5k errors/mês; SDK Go + Next.js oficiais; breadcrumbs + performance; já referenciado em `architecture.md`. |
| **Uptime / Status** | Better Stack, Healthchecks.io, UptimeRobot | **Better Stack** | Já incluso na escolha de logs; status page em `status.indica.ai`; alertas via email/Slack; 10 monitors gratuitos. |
| **Secrets manager** | Doppler, 1Password Secrets, AWS Secrets Manager, fly.io secrets | **Fly.io secrets (MVP) → Doppler (time crescer)** | `fly secrets set KEY=VALUE` é suficiente para time solo/duo; zero custo extra; secrets injetados como env vars nos containers. Doppler quando >2 devs e ambientes múltiplos precisarem de auditoria granular. |

### 1.2 Custo mensal estimado (MVP: ~100 tenants, ~10k req/dia, ~100GB egress)

| Componente | Plano | USD/mês |
|-----------|-------|---------|
| Vercel (3 apps) | Pro ($20/mês plano base) | $20 |
| Fly.io API (shared-cpu-1x, 256MB) | ~$3/mês (billing por segundo) | $3 |
| Fly.io Worker (shared-cpu-1x, 256MB) | ~$2/mês | $2 |
| Fly.io Postgres (single, 1GB) | $7/mês | $7 |
| Upstash Redis | Free tier | $0 |
| Cloudflare Workers + KV | Free tier (100k req/dia) | $0 |
| Cloudflare R2 | Free tier (10GB) | $0 |
| Cloudflare DNS/WAF | Free | $0 |
| Resend | Free tier (3k/mês) | $0 |
| Grafana Cloud | Free tier | $0 |
| Better Stack (logs + uptime) | Free tier | $0 |
| Sentry | Free tier | $0 |
| **Total MVP** | | **~$32/mês** |

**Cenário 10x volume (1k tenants, 100k req/dia):**

| Componente | Estimativa |
|-----------|-----------|
| Vercel Pro (tráfego crescido) | $40–60 |
| Fly.io API (scale 2x instances) | $15 |
| Fly.io Postgres (upgraded 4GB) | $30 |
| Upstash Redis (paid tier) | $10 |
| Cloudflare Workers (Paid $5/mês) | $5 |
| Better Stack (Starter $24) | $24 |
| Sentry (Team) | $26 |
| **Total 10x** | **~$160–175/mês** |

---

## 2. IaC Strategy

### 2.1 Decisão: arquivos descritivos + Terraform para recursos compartilhados

**Postura pragmática para MVP:** nem tudo precisa de Terraform agora. A regra é:

| O que é IaC | Ferramenta | Por quê |
|-------------|-----------|---------|
| DNS records (Cloudflare) | Terraform | DNS errado = downtime total; versionamento obrigatório |
| Cloudflare Workers + KV namespaces | Wrangler (`wrangler.toml`) | CLI oficial Cloudflare; suficiente |
| Fly.io apps (api, worker) | `fly.toml` + Terraform Fly provider | fly.toml é IaC suficiente; Terraform para criação inicial do Postgres e volumes |
| Fly.io Postgres (criação) | Terraform | One-shot; precisa de state para não recriar |
| Upstash Redis | Terraform provider | Evita config manual de database/endpoint |
| Vercel projects + env vars | Terraform Vercel provider | Env vars de produção não devem ser configuradas à mão |
| **NÃO IaC (MVP):** Grafana dashboards | Manual | Dashboards mudam muito no início; exportar JSON quando estabilizar |
| **NÃO IaC (MVP):** Sentry project | Manual | Configuração única; não justifica provider |
| **NÃO IaC (MVP):** Better Stack sources | Manual | Interface simples; 1x setup |

### 2.2 State files

- **Backend:** Terraform Cloud (free tier, 500 resources) — evita state em S3/GCS que exige mais infra. Alternativa zero-cost: state em Git cifrado com `git-crypt` (aceitável para time solo).
- **Workspace por ambiente:** `staging` e `production` como workspaces separados no Terraform Cloud.

### 2.3 Estrutura de diretórios

```
infra/
├── terraform/
│   ├── modules/
│   │   ├── fly-app/            # módulo reutilizável para apps Fly.io
│   │   ├── cloudflare-dns/     # registros DNS do projeto
│   │   └── upstash-redis/      # banco Redis
│   ├── environments/
│   │   ├── staging/
│   │   │   ├── main.tf
│   │   │   ├── variables.tf
│   │   │   └── terraform.tfvars
│   │   └── production/
│   │       ├── main.tf
│   │       ├── variables.tf
│   │       └── terraform.tfvars
│   └── shared/                 # recursos sem ambiente (R2 bucket, Cloudflare zone)
│       └── main.tf
├── fly/
│   ├── api/
│   │   ├── fly.toml
│   │   └── Dockerfile
│   └── worker/
│       ├── fly.toml
│       └── Dockerfile
└── cloudflare/
    └── tracker/
        └── wrangler.toml       # já existe em workers-edge/tracker/
```

---

## 3. Ambientes

### 3.1 Staging vs Production

| Camada | Staging | Production |
|--------|---------|-----------|
| Fly.io API | app `indica-api-staging` (GRU, shared-cpu-1x) | app `indica-api-prod` (GRU, shared-cpu-1x, min_machines=1) |
| Fly.io Worker | app `indica-worker-staging` | app `indica-worker-prod` |
| Postgres | Fly Postgres `indica-db-staging` (1GB) | Fly Postgres `indica-db-prod` (1GB, PITR habilitado) |
| Upstash Redis | database separado `indica-redis-staging` | database `indica-redis-prod` |
| Vercel | Preview automático por PR (branch preview) + branch `main`→staging | Domain `app.indica.ai`, `partner.indica.ai`, `indica.ai` |
| Cloudflare Workers | staging namespace KV | production namespace KV |
| DNS | subdomínio `*.staging.indica.ai` | `*.indica.ai` |

**Isolamento total**: staging e produção nunca compartilham DB, Redis ou secrets.

### 3.2 Criação de tenants no MVP

- **Manual:** admin do SaaS cria tenant via `POST /admin/tenants` no painel admin ou diretamente com `make seed` adaptado.
- **Self-serve (Fase 2):** fluxo de onboarding no frontend → cria tenant automaticamente.
- Não existe automação de provisionamento de infra por tenant (modelo shared, RLS garante isolamento).

### 3.3 Feature flags

Atualmente: `ENABLE_MFA` e `RATE_LIMIT_ENABLED` em env var. Estratégia MVP:

- Feature flags = env vars nos secrets do Fly.io.
- Sem ferramenta dedicada (LaunchDarkly/Flipt) até ter >3 flags simultâneos em uso real.
- Convenção: `ENABLE_<FEATURE>=true|false`. Fly.io suporta `fly secrets set` sem restart com `--stage`.

### 3.4 Migrations em produção

- **Forward-only obrigatório** (sem `down` em prod). Migrations down existem apenas para dev local.
- **Execução:** job separado no CI (`cmd/migrate/main.go up`) que roda **antes** do deploy do novo binário. GitHub Actions job `migrate` precede `deploy`.
- **Travamento:** `golang-migrate` usa advisory lock no Postgres; impossível rodar duas migrations simultâneas.
- **Rollback:** não revertemos migration — escrevemos uma nova migration corretiva. Em caso de emergência: snapshot PITR (ver §6).
- **Testagem em staging:** toda PR com migration deve passar em staging antes de ir para prod. CI bloqueia se migration falha em staging.

---

## 4. CI/CD Pipeline

### 4.1 Visão geral dos workflows

```
.github/workflows/
├── ci.yml          # roda em todo PR e push para main
├── deploy.yml      # roda após merge em main (staging) e tags semver (prod)
└── migrate.yml     # workflow reutilizável de migration
```

### 4.2 Jobs do `ci.yml`

Todos os jobs rodam em paralelo onde possível. Todos bloqueiam merge para `main` se falharem.

```yaml
# Estrutura simplificada
jobs:
  lint-go:
    # golangci-lint run ./...
    # go vet ./...
    # govulncheck ./...
    # go-arch-lint (fronteiras de pacote)

  lint-frontend:
    # biome check web/
    # tsc --noEmit (cada app)

  test-unit:
    # go test ./internal/... -short -count=1
    # jest (web/packages/)

  test-integration:
    services:
      postgres: { image: postgres:16, env: { POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB } }
      redis:    { image: redis:7-alpine }
    steps:
      # go run cmd/migrate/main.go up
      # go test ./... -tags=integration -count=1

  security-scan:
    # govulncheck ./...
    # npm audit --audit-level=high (cada workspace)
    # trivy image (Dockerfile) — apenas em push para main

  build-go:
    # docker build -f fly/api/Dockerfile --target=builder .
    # docker build -f fly/worker/Dockerfile --target=builder .

  build-frontend:
    # pnpm --filter=dashboard build
    # pnpm --filter=partner build
    # pnpm --filter=public build
```

**Todos os jobs acima bloqueiam merge para `main`.** Exceção: `security-scan` com `trivy` (imagem Docker) — warning, não bloqueante no MVP (torna-se bloqueante após go-live).

### 4.3 `deploy.yml` — staging (automático) e produção (manual)

```
Trigger: push para main
  → job: migrate (staging DB)
  → job: deploy-api-staging
  → job: deploy-worker-staging
  → job: deploy-edge-tracker-staging (wrangler deploy --env staging)
  → job: smoke-test-staging (curl /healthz + /r/:slug)

Trigger: tag v*.*.* (semver)
  → job: migrate (prod DB)              ← environment: production (requires approval)
  → job: deploy-api-prod               ← environment: production
  → job: deploy-worker-prod
  → job: deploy-edge-tracker-prod
  → job: smoke-test-prod
  → job: notify-slack
```

**Aprovação manual para produção:** GitHub Environments com `required_reviewers: 1`. Qualquer membro do time pode aprovar.

### 4.4 Versionamento

- **Trunk-based development**: `main` sempre deployável.
- **Tags semver** (`v1.2.3`) disparam deploy de produção. Criadas manualmente (`git tag -s v1.0.0`).
- Sem branches de release no MVP.
- PRs pequenos, merge direto para `main` após CI verde + 1 reviewer.

### 4.5 Cache no CI

```yaml
# Go modules
- uses: actions/cache@v4
  with:
    path: |
      ~/go/pkg/mod
      ~/.cache/go-build
    key: go-${{ hashFiles('go.sum') }}

# pnpm
- uses: actions/cache@v4
  with:
    path: ~/.pnpm-store
    key: pnpm-${{ hashFiles('web/pnpm-lock.yaml') }}

# Docker layer cache (GitHub Actions cache backend)
- uses: docker/build-push-action@v5
  with:
    cache-from: type=gha
    cache-to: type=gha,mode=max
```

### 4.6 Container registry

**GHCR (GitHub Container Registry)** — incluído no GitHub. Imagens tagueadas com `sha-<commit>` e `latest-staging` / `v<semver>` para prod.

---

## 5. Observability + Alertas + SLA

### 5.1 Golden Signals

| Signal | Fonte | Métrica | Tool |
|--------|-------|---------|------|
| **Latência** | chi middleware (histograma) | `http_request_duration_seconds` p50/p95/p99 | Grafana Cloud |
| **Tráfego** | chi middleware | `http_requests_total` por rota + status | Grafana Cloud |
| **Erros** | chi middleware + Sentry | `http_requests_total{status=~"5.."}` + error events | Grafana Cloud + Sentry |
| **Saturação** | Fly.io metrics + pgx pool | CPU%, memory%, `pgxpool_acquire_duration` | Grafana Cloud |

Métricas Prometheus já disponíveis via `internal/platform/observability/` + endpoint `:9090/metrics` — apenas precisa de scrape config no Grafana.

### 5.2 Logs estruturados

- Backend Go: `slog` com handler JSON → stdout → coletado pelo Fly.io → shipped para **Better Stack Logtail** via drain de logs (`fly logs --app indica-api-prod | logtail`).
- Frontend: logs de erro via Sentry; request logs via Vercel Analytics (gratuito).
- Cloudflare Workers: Workers Logpush → Better Stack (ou console.log em dev).
- Formato de log obrigatório: `{ "level": "info", "ts": "...", "tenant_id": "...", "request_id": "...", "msg": "..." }`

### 5.3 Distributed Tracing (OTel)

`OTEL_EXPORTER_OTLP_ENDPOINT` já existe em `.env.example`. Em produção:

```bash
fly secrets set OTEL_EXPORTER_OTLP_ENDPOINT=https://otlp-gateway-prod.grafana.net/otlp \
               OTEL_EXPORTER_OTLP_HEADERS="Authorization=Basic <grafana-token>"
```

Grafana Tempo recebe traces; `service.name=indica-api` e `service.name=indica-worker` como atributos resource.

### 5.4 Top-5 alertas obrigatórios antes do go-live

| # | Alerta | Condição | Threshold | Canal |
|---|--------|---------|-----------|-------|
| 1 | **API down** | `/healthz` não responde | >2 min | PagerDuty/email |
| 2 | **Taxa de erro HTTP 5xx** | `rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m])` | >2% por 5min | Slack #alerts |
| 3 | **Postgres conexões saturadas** | `pgxpool_acquired_conns / pgxpool_max_conns` | >85% | Slack #alerts |
| 4 | **Job de payout falhou** | Worker log com `level=error` + `worker=payout` | Qualquer ocorrência | Email + Slack #pagamentos |
| 5 | **Disco Postgres** | Fly volume usage | >80% | Slack #infra |

Todos configurados via **Better Stack** (uptime checks + log alerts) e Grafana Cloud (métricas).

### 5.5 SLA Target

**99.5% de uptime mensal** (~3.6h de downtime tolerado/mês).

Justificativa:
- MVP sem SLA contratual com clientes ainda.
- Fly.io garante 99.9% para máquinas com `min_machines_running=1`.
- Manutenções programadas (migrations, deploys) contam para o orçamento de downtime.
- Blue/green deploy não implementado no MVP — janela de downtime esperada: 10–30s por deploy.
- **Escalar para 99.9%** quando o primeiro contrato com SLA formal for assinado — exige: blue/green deploy, read replica Postgres, multi-machine Fly.

---

## 6. Backup & Disaster Recovery

### 6.1 RPO e RTO

| Objetivo | Target MVP | Justificativa |
|---------|-----------|---------------|
| **RPO** (máximo de dados perdidos) | 1 hora | PITR do Fly Postgres; backups contínuos a cada ~5min |
| **RTO** (tempo para restaurar serviço) | 2 horas | Restauração de PITR + redeploy manual + DNS propagation |

Rewards e payouts são críticos — RPO de 1h é aceitável porque transações financeiras têm registro duplo (DB + logs de auditoria imutáveis). Em fase de produção com payouts reais, considerar RPO de 15min com replica sincronizada.

### 6.2 Estratégia Postgres

- **Fly.io Postgres PITR**: habilitado por padrão nos planos pagos. Retenção de 7 dias.
- **Snapshot diário manual** via `fly postgres backup` agendado como GitHub Actions scheduled workflow (`0 3 * * *` BRT = `06:00 UTC`).
- Snapshots armazenados em Cloudflare R2 (`backups/postgres/YYYY-MM-DD/`) — zero egress fee.
- **Teste de restauração mensal**: obrigatório antes de go-live, agendado no calendário.

```yaml
# .github/workflows/backup.yml
on:
  schedule:
    - cron: '0 6 * * *'  # 3h BRT
jobs:
  backup:
    steps:
      - run: fly postgres backup --app indica-db-prod
      - run: # upload to R2 via rclone
```

### 6.3 Estratégia R2

- **Versionamento de objeto**: habilitado no bucket `indica-storage-prod`. Versões anteriores retidas por 30 dias.
- **Cross-region**: R2 replica automaticamente (Cloudflare global network). Sem configuração extra necessária.
- Dados críticos em R2: exportações LGPD, brindes físicos (referências), relatórios. Não são dados transacionais primários — baixo risco.

### 6.4 Runbook de DR — Cenário: Postgres inativo

```
INCIDENTE: Fly.io Postgres indisponível ou dados corrompidos

1. DIAGNOSTICAR (0–15min)
   - fly status --app indica-db-prod
   - fly logs --app indica-db-prod
   - Verificar painel Fly.io em fly.io/apps
   - Se hardware issue: Fly.io suporte via fly.io/support

2. MITIGAÇÃO IMEDIATA (0–5min)
   - Colocar API em modo manutenção: fly secrets set MAINTENANCE_MODE=true
   - Isso retorna HTTP 503 com mensagem amigável (adicionar middleware)

3. RESTAURAÇÃO VIA PITR (15–90min)
   - fly postgres restore --app indica-db-prod --restore-target-time "2026-05-13T14:00:00Z"
   - Aguardar provisionamento (~10–30min dependendo do tamanho)
   - Validar: fly postgres connect -a indica-db-prod → SELECT COUNT(*) FROM tenants;

4. REDEPLOY (5–15min)
   - fly deploy --app indica-api-prod
   - fly deploy --app indica-worker-prod

5. VALIDAÇÃO
   - curl https://api.indica.ai/healthz
   - Verificar últimos 10 rows de rewards/payouts — confirmar integridade
   - fly secrets set MAINTENANCE_MODE=false

6. POST-MORTEM
   - Registrar no GitHub Issues com label "incident"
   - Calcular dados perdidos (janela entre último backup e falha)
   - Notificar tenants afetados se RPO foi ultrapassado
```

### 6.5 Criticidade dos dados

| Dado | Criticidade | Por quê |
|------|------------|---------|
| `rewards`, `payouts` | 🔴 CRÍTICO | Dinheiro real; regulatório |
| `referrals`, `attributions` | 🔴 CRÍTICO | Base para cálculo de comissões |
| `tenants`, `users`, `programs` | 🟡 ALTO | Config recriável com suporte |
| `click_events` | 🟢 MÉDIO | Analytics; agregados preserváveis |
| `refresh_tokens`, `idempotency_keys` | 🟢 BAIXO | Recriáveis; usuário faz login novamente |

---

## 7. Segurança Operacional

### 7.1 Secrets em produção

- **Nunca em git.** `.gitignore` inclui `.env`, `.env.local`, `.env.production`.
- Secrets injetados via `fly secrets set KEY=VALUE` — armazenados cifrados nos Fly.io vaults.
- Vercel: env vars configuradas via dashboard Vercel ou `vercel env add` (ou Terraform provider).
- Rotação documentada abaixo; histórico de rotações no log de auditoria interno do time.

### 7.2 Rotação de JWT_SECRET

- **Frequência:** a cada 90 dias, ou imediatamente após suspeita de comprometimento.
- **Processo (zero-downtime):**
  1. Adicionar novo secret como `JWT_SECRET_NEW` nos Fly.io secrets.
  2. Atualizar código para aceitar verificação com `JWT_SECRET` ou `JWT_SECRET_NEW` (by `kid` no header JWT).
  3. Deploy.
  4. Após 31 dias (tempo máximo de refresh token), remover `JWT_SECRET` antigo.
  5. Renomear `JWT_SECRET_NEW` → `JWT_SECRET`.
- **No MVP** (time solo): rotação mais simples — novo deploy invalida todos os refresh tokens; usuários fazem login novamente. Aceitável antes de ter base de usuários ativa.

### 7.3 Rotação de API Keys de tenant (SEC-03)

- Implementado no backend: `POST /api-keys/:id/rotate` gera nova key e invalida a antiga após grace period de 15 minutos.
- Grace period configurável por tenant (default 15min, máx 24h).

### 7.4 Acesso à produção

| Quem | Acesso | Restrição |
|------|--------|-----------|
| Engenheiro principal | Fly.io org admin, Vercel team owner, Cloudflare account admin | MFA TOTP obrigatório em todas as plataformas |
| CI/CD (GitHub Actions) | Tokens de deploy com escopo mínimo (fly deploy only, vercel deploy token) | Tokens nunca têm permissão de leitura de dados ou secrets |
| Emergência DB | `fly postgres connect` via Fly CLI autenticado | Log de toda sessão; não executar DDL sem migration |

**MFA obrigatório** em: Fly.io, Vercel, Cloudflare, GitHub, Terraform Cloud. Sem exceções.

### 7.5 Network

- **API Fly.io é pública** (necessário — frontend e parceiros chamam diretamente), protegida por:
  - Rate limiting Redis na camada da aplicação (§7.4 de `architecture.md`)
  - Cloudflare WAF na frente (proxied = orange cloud no DNS)
  - Fly.io não expõe management port; apenas porta 8080 exposta
- **Worker Fly.io é privado**: não tem `services` públicos no `fly.toml`; comunica com API e Postgres via rede privada Fly (WireGuard `fly-local-6pn`).
- **Postgres Fly.io é privado**: acessível apenas dentro da Fly.io org network. Sem IP público.
- **Redis Upstash**: protegido por TLS + token de acesso. `REDIS_URL` inclui credenciais — armazenar apenas em Fly secrets.

### 7.6 Proteções adicionais

- **Dependabot**: habilitado para Go modules e npm (`.github/dependabot.yml`).
- **GitHub Secret Scanning**: habilitado no repositório (detecta chaves expostas em commits).
- **`govulncheck`**: roda no CI a cada push (já no `ci.yml`).
- **`npm audit --audit-level=high`**: roda no CI para cada workspace do monorepo.
- **GHCR image scanning**: Trivy scan na imagem Docker antes do deploy para produção.

---

## 8. Custo Total Mensal (Sumário)

### MVP (~100 tenants, ~10k req/dia)

| Componente | USD/mês |
|-----------|---------|
| Vercel Pro | $20 |
| Fly.io (API + Worker) | $5 |
| Fly.io Postgres | $7 |
| Upstash Redis | $0 |
| Cloudflare (Workers + R2 + DNS/WAF) | $0 |
| Resend | $0 |
| Grafana Cloud | $0 |
| Better Stack | $0 |
| Sentry | $0 |
| GitHub Actions (public repo) | $0 |
| Terraform Cloud | $0 |
| **TOTAL MVP** | **~$32/mês** |

> ⚠️ Vercel Pro é necessário para: bandwidth >100GB, time limit >10s em serverless functions, e suporte. No MVP sem volume real, Hobby ($0) pode ser suficiente — escale quando precisar.
> **TOTAL MVP mínimo (Vercel Hobby):** ~$12/mês

### Cenário 10x (~1k tenants, ~100k req/dia, ~1TB egress)

| Componente | USD/mês |
|-----------|---------|
| Vercel Pro (+ bandwidth) | $50–80 |
| Fly.io (2 API machines + worker) | $20 |
| Fly.io Postgres (Performance-1x) | $50 |
| Upstash Redis (Pay-as-you-go) | $15 |
| Cloudflare Workers (Paid) | $5 |
| Resend (Starter, 50k emails) | $20 |
| Better Stack Starter | $24 |
| Sentry Team | $26 |
| **TOTAL 10x** | **~$210–240/mês** |

---

## 9. Roadmap de Execução — Tickets DEVOPS-XX

### 🔴 Bloqueantes para go-live (executar antes de qualquer cliente real)

| # | Ticket | Tarefa | Estimativa |
|---|--------|--------|-----------|
| DEVOPS-01 | 🔴 | Criar apps Fly.io (`indica-api-prod`, `indica-worker-prod`) e Postgres (`indica-db-prod`) — via Terraform ou `fly launch` | 2h |
| DEVOPS-02 | 🔴 | Configurar todos os secrets de produção via `fly secrets set` (JWT_SECRET, DATABASE_URL, REDIS_URL, ASAAS_API_KEY, RESEND_API_KEY, R2_*, etc.) | 1h |
| DEVOPS-03 | 🔴 | Criar `Dockerfile` otimizado para API e Worker (multi-stage: builder Alpine → distroless ou scratch) com health check em `/healthz` | 3h |
| DEVOPS-04 | 🔴 | Criar `fly.toml` para API (porta 8080, região GRU, `min_machines_running=1`, health check) e Worker (sem service público) | 1h |
| DEVOPS-05 | 🔴 | Implementar GitHub Actions `ci.yml`: lint-go + lint-frontend + test-unit + test-integration (com postgres/redis services) | 4h |
| DEVOPS-06 | 🔴 | Implementar GitHub Actions `deploy.yml`: staging automático (merge main) + produção com approval (tag semver) | 3h |
| DEVOPS-07 | 🔴 | Configurar DNS Cloudflare: `api.indica.ai → Fly.io`, `app.indica.ai → Vercel`, `partner.indica.ai → Vercel`, `indica.ai → Vercel`, `r.indica.ai → Cloudflare Workers` | 2h |
| DEVOPS-08 | 🔴 | Configurar Vercel: 3 projetos (dashboard, partner, public) com env vars de produção e domínios customizados | 2h |
| DEVOPS-09 | 🔴 | Deploy e configurar Cloudflare Worker (tracker edge) em produção via `wrangler deploy` + KV namespace prod | 2h |
| DEVOPS-10 | 🔴 | Configurar Top-5 alertas no Better Stack (uptime `/healthz`) + Grafana Cloud (métricas Prometheus) | 2h |

### 🟡 Executar na primeira semana pós-launch

| # | Ticket | Tarefa | Estimativa |
|---|--------|--------|-----------|
| DEVOPS-11 | 🟡 | Configurar Sentry em API Go (`sentry-go`) e nos 3 apps Next.js (`@sentry/nextjs`) | 2h |
| DEVOPS-12 | 🟡 | Configurar Fly.io log drain → Better Stack Logtail (webhook ou syslog) | 1h |
| DEVOPS-13 | 🟡 | Configurar OTel exporter no Go (Grafana Tempo OTLP endpoint) via env vars no Fly | 1h |
| DEVOPS-14 | 🟡 | Criar `infra/terraform/` com módulos Fly.io + Cloudflare DNS + Upstash para reproducibilidade | 4h |
| DEVOPS-15 | 🟡 | Implementar GitHub Actions `backup.yml`: snapshot diário Postgres → R2 às 03h BRT | 2h |
| DEVOPS-16 | 🟡 | Criar ambiente staging completo (isolado de prod) com dados do `make seed` | 3h |
| DEVOPS-17 | 🟡 | Adicionar job `security-scan` (Trivy image scan) ao CI — bloqueante para prod, warning em staging | 1h |
| DEVOPS-18 | 🟡 | Documentar runbook de operações: deploy, rollback, rotação de secrets, restauração de DB | 2h |

### 🟢 Otimizações (backlog, sem urgência)

| # | Ticket | Tarefa | Estimativa |
|---|--------|--------|-----------|
| DEVOPS-19 | 🟢 | Blue/green deploy no Fly.io para zero-downtime (escalar quando SLA 99.9% for requisito contratual) | 4h |
| DEVOPS-20 | 🟢 | Migrar secrets management para Doppler quando time tiver >2 engenheiros | 2h |
| DEVOPS-21 | 🟢 | Grafana dashboards como código (JSON provisioning via Terraform) | 3h |
| DEVOPS-22 | 🟢 | Teste automatizado de DR mensal (cron que restaura snapshot de staging e valida integridade) | 4h |
| DEVOPS-23 | 🟢 | Read replica Postgres no Fly.io para queries analíticas pesadas do painel admin | 2h |
| DEVOPS-24 | 🟢 | Preview environments por PR (Neon branching ou Fly.io ephemeral machines) | 6h |
| DEVOPS-25 | 🟢 | Particionamento mensal da tabela `click_events` quando >50M rows | 4h |

---

## Apêndice A — fly.toml (referência API)

```toml
app = 'indica-api-prod'
primary_region = 'gru'

[build]
  dockerfile = 'infra/fly/api/Dockerfile'

[env]
  HTTP_ADDR     = ':8080'
  LOG_FORMAT    = 'json'
  LOG_LEVEL     = 'info'

[http_service]
  internal_port       = 8080
  force_https         = true
  auto_stop_machines  = 'stop'
  auto_start_machines = true
  min_machines_running = 1

  [[http_service.checks]]
    grace_period = '5s'
    interval     = '15s'
    method       = 'GET'
    path         = '/healthz'
    timeout      = '5s'

[[vm]]
  size = 'shared-cpu-1x'
  memory = '256mb'
```

---

## Apêndice B — Dockerfile multi-stage (referência)

```dockerfile
# Build stage
FROM golang:1.24-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /bin/api ./cmd/api

# Final stage
FROM gcr.io/distroless/static-debian12
COPY --from=builder /bin/api /api
USER nonroot:nonroot
EXPOSE 8080
ENTRYPOINT ["/api"]
```

---

*Próxima etapa: **ETAPA 11 — Growth & Go-to-Market** (`@growth-chief`)*
*Dependência: DEVOPS-01 a DEVOPS-10 devem estar concluídos antes de qualquer aquisição de cliente real.*
