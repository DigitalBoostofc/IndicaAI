# Indica AÍ! — Security Audit (ETAPA 8)

**Versão:** 1.0
**Última revisão:** 2026-05-14
**Escopo:** API Go + workers + frontends Next.js + infraestrutura VPS+Vercel
**Modelo de ameaça:** SaaS B2B multi-tenant onde o ativo crítico é a integridade da atribuição de comissões (fraude vira dinheiro real).

---

## TL;DR

| Categoria | Estado |
|-----------|--------|
| Auth + sessão | ✅ Argon2id + JWT short-lived + refresh tokens + Same-Site=None+Secure |
| Multi-tenant | ✅ RLS forçado em todas as tabelas com `tenant_id` |
| Antifraude | ✅ engine com 6 signals + scoring → review/block + audit |
| Rate limiting | ✅ Redis token bucket por IP e por tenant |
| Headers HTTP | ✅ HSTS, CSP, X-Frame, Referrer-Policy, Permissions-Policy |
| CORS | ✅ allowlist explícita (indica.ai, vercel.app, localhost) |
| Auditoria | 🟡 audit_log existe e é populado; UI admin ainda não |
| Sessões | 🟡 refresh_tokens existe; usuário não tem UI pra revogar |
| MFA / 2FA | ❌ coluna `mfa_secret` existe; sem fluxo |
| Bloqueio após N falhas | ❌ rate limit cobre brute force parcialmente; sem lockout dedicado |
| Pentest externo | ❌ a contratar quando próximo de GA |
| Resposta a incidente | 🟡 retenção e logs prontos; runbook formal ainda não |

---

## 1. Modelo de ameaças

### Atores hostis prováveis
1. **Parceiro malicioso** — quer driblar o antifraude pra coletar comissões indevidas (auto-referral, click farms).
2. **Concorrente** — quer mapear estrutura de programas/tenants pra explorar lacunas.
3. **Script-kiddie / bots** — credential stuffing, scraping de endpoints públicos, busca por arquivos .env (tem evidência disso nos logs).
4. **Tenant malicioso** — admin de tenant tentando acessar dados de outro tenant (acidental ou intencional).
5. **Insider** — operador interno com acesso ao banco (mitigação: audit_log, hash de PII).

### Ativos críticos
- **Integridade da atribuição** (cada referral → reward → payout): se hackeado, vira fraude de pagamento direta.
- **PII dos leads e parceiros** (nome, email, telefone, CPF/Pix): proteção LGPD.
- **Credenciais** (senhas, JWT secret, Pix keys).

---

## 2. OWASP Top 10 (2021) — walkthrough

### A01: Broken Access Control

**Implementado:**
- Toda rota autenticada passa por `middleware.AuthJWT` (assina/valida HS256 com `JWT_SECRET`).
- `middleware.TenantInjector` extrai `tenant_id` do JWT e injeta no contexto.
- **Postgres RLS forçado em todas as 17 tabelas com `tenant_id`** (`relforcerowsecurity=t`): mesmo um bug de query que esquecesse `WHERE tenant_id = $1` é cortado no nível do banco.
- Rotas admin (`/api/admin/*`) checam role `saas_admin` via `middleware.RequireRole`.

**Como verificar:**
```sql
SELECT relname FROM pg_class WHERE relrowsecurity;
-- esperado: 17 tabelas (programs, partners, leads, referrals, rewards, payouts, etc.)
```

**Riscos residuais:**
- Endpoint `/api/admin/tenants` ainda retorna placeholder `{"tenants":[]}`. Quando implementado, ler RLS bypass intencional pra saas_admin precisa ser explícito (SET LOCAL para um valor especial).
- Frontend bug que esqueça de checar role faz o admin ver "Aceitar/Rejeitar" em comissões alheias até clicar → backend rejeita, mas é UX ruim. Centralizar role-aware UI em `useAuth()`.

### A02: Cryptographic Failures

**Implementado:**
- Senhas armazenadas com **Argon2id** (resistente a GPU). Custo padrão `time=3, memory=64MB, parallelism=2`.
- JWT assinado com HS256 + secret de 256 bits em `/etc/indica-ai/secrets.env` (chmod 600).
- TLS 1.2+ obrigatório via Traefik (Let's Encrypt).
- Cookies de sessão: `HttpOnly; Secure; SameSite=None` (cross-site auth com Vercel).

**Riscos residuais:**
- JWT_SECRET é um único valor — sem rotação. Pra rotação, manter `JWT_SECRETS` array no config e aceitar a lista no verify. **Pendente.**
- Pix keys salvas em texto plano no campo `partners.pix_key`. Pra MVP manual ok; quando integrar gateway, criptografar at-rest com KMS.

### A03: Injection

**Implementado:**
- Todas queries usam **pgx parameterized statements** (`$1, $2…`). Sem string concat em SQL **com uma exceção controlada**: `SET LOCAL app.current_tenant = '<uuid-validado>'` — a interpolação é literal porque pgx não suporta bind em SET LOCAL, e o valor passa por `uuid.Parse` upstream. Anti-pattern documentado em [[feedback_pgx_set_local_bug]].
- Frontend usa React/Next — escaping de XSS automático em `{value}`. `dangerouslySetInnerHTML` não é usado em nenhum lugar.

**Riscos residuais:**
- Comando do tracking redirect (`/r/{slug}`) usa o slug direto no SQL — mas é parametrizado, OK.
- `notes` em leads é texto livre; se renderizado em e-mail HTML futuro, escapar.

### A04: Insecure Design

**Implementado:**
- Decisões críticas atravessam o `fraud.Engine` antes de gravar `attribution_score`. Resultado fica no `audit_log` com evidência completa, não-deletável (append-only).
- Rate limit fail-closed por padrão (rejeita 503 se Redis cai) em endpoints sensíveis; fail-open só no tracking de cliques (UX > segurança).
- Pagamentos manuais no MVP: estado de cada payout passa por transições explícitas (`pending → confirmed → paid` ou `cancelled`), com idempotency-key em `paid` e `cancel`.

**Riscos residuais:**
- O `attribution_score` de 0.3 (review) vs 0.0 (block) é uma decisão de produto não totalmente documentada — abre brecha pra parceiro suspeito ainda ganhar 30% da comissão. Revisar com @product-chief.
- Sem journaling de eventos de domínio (event sourcing). Reconstruir o estado de um payout requer leitura de várias tabelas. OK pro MVP.

### A05: Security Misconfiguration

**Implementado:**
- **Headers**: HSTS (2 anos + preload), X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy strict-origin-when-cross-origin, Permissions-Policy denegando geo/mic/camera, CSP default-src 'self' + frame-ancestors 'none'.
- **CORS**: allowlist explícita (`https://*.indica.ai`, `https://*.vercel.app`, `http://localhost:*`). Não usa `*`.
- Distroless image em produção (`gcr.io/distroless/static-debian12:nonroot`) — sem shell, mínimo de pacotes.
- Container roda como `nonroot` (uid 65532).
- Postgres + Redis em rede overlay privada (`indica-ai_indica-internal`), nunca expostos pela internet.

**Riscos residuais:**
- CSP `default-src 'self'` é razoável mas o frontend é em outro domínio (`*.vercel.app`). Não tem efeito real porque a API serve só JSON. Mas vale revisar quando expor páginas HTML da API.
- Backend tá em `https://api.181-215-134-11.sslip.io` (subdomínio sslip baseado em IP). Funcional, mas qualquer rotação de IP quebra tudo. **Plano: mover pra `api.indica.ai` quando o DNS for compraado** (item de ETAPA 11).

### A06: Vulnerable & Outdated Components

**Implementado:**
- Go 1.25 (atual em 2026).
- govulncheck no CI (em modo `continue-on-error` por ora — re-habilitar como bloqueante).
- Dependabot/Renovate: **não configurado.** Pendente.

**Riscos residuais:**
- Atualização manual de deps. **Recomendação:** adicionar Dependabot semanal nos repos `go.mod` e `package.json` dos 3 apps.

### A07: Identification & Authentication Failures

**Implementado:**
- Argon2id (ver A02).
- Magic link e login com rate limit por IP fail-closed (5/min pra login, 10/min pra verify magic link).
- Refresh tokens revogáveis em `refresh_tokens` (revoked_at).
- Logout limpa cookie + revoga refresh.

**Riscos residuais:**
- **Sem account lockout dedicado.** Brute force lento (5/min/IP × 1 conta) é teoricamente viável. Lockout após N falhas seria boa adição (item futuro).
- **MFA não implementado** apesar da coluna `mfa_secret` existir. Próxima iteração.
- Sem detecção de credential stuffing (IPs distintos, mesma senha em vários e-mails).

### A08: Software & Data Integrity Failures

**Implementado:**
- Pipeline de deploy assina commit no `/healthz` (`build.Commit` injetado via `-ldflags`). Smoke estrito valida que o SHA em prod casa com o `${{ github.sha }}` da release antes de declarar verde.
- Rollback automático pra `:previous` se smoke falhar.
- Imagens taggadas por SHA, prune mantém os 5 últimos.

**Riscos residuais:**
- **Imagens não são assinadas** (cosign/sigstore). MVP roda só na nossa VPS, então ataque de supply chain de imagem é baixo. Quando expandir, assinar.
- Source repo na VPS é puxado via `git pull`, sem verificação de signed commit. Self-hosted runner roda no mesmo host, então atacante que entrou já tem tudo de qualquer forma — não muda muito.

### A09: Security Logging & Monitoring Failures

**Implementado:**
- `audit_log` append-only com triggers de fraude, payout, LGPD, login.
- Logger estruturado (slog JSON) em todos os handlers, com `request_id`.
- Retention sweep diário no LGPD worker: anonimiza `click_events` após 12 meses, deleta refresh tokens revogados +30d, expira idempotency_keys.

**Riscos residuais:**
- **Sem alertas em tempo real.** Acúmulo de fraudes "review" precisa ser checado manualmente. Adicionar webhook/email pro admin quando volume de blocked passa de threshold.
- Logs ficam só no journal do container — sem agregação externa (Datadog, Grafana Loki, etc.).

### A10: Server-Side Request Forgery (SSRF)

**Implementado:**
- API não faz nenhuma chamada outbound a URLs controladas pelo usuário no MVP.
- O único outbound é pro provedor de e-mail (transacional), com URL fixa em env.

**Riscos residuais:**
- Quando integrar webhook pra cliente (notificar lead criado, etc.), validar URL pra evitar SSRF (bloquear loopback, RFC1918, etc.).

---

## 3. Gaps priorizados pra fechar antes de GA

| # | Item | Prioridade | Esforço |
|---|------|------------|---------|
| 1 | UI de auditoria no dashboard | alta | médio |
| 2 | Endpoint de sessões + revoke | alta | baixo |
| 3 | MFA (TOTP) | média | médio |
| 4 | Account lockout dedicado | média | baixo |
| 5 | Rotação de JWT secret | média | baixo |
| 6 | Cifragem de Pix keys at-rest | baixa (MVP manual) | médio |
| 7 | Dependabot | baixa | trivial |
| 8 | Pentest externo | obrigatório pré-GA | externo |
| 9 | Agregação de logs (Loki/Datadog) | baixa | médio |
| 10 | Mover backend pra `api.indica.ai` | baixa (após DNS) | trivial |

Itens 1 e 2 já estão como tarefas desta sessão (ver TaskList).

---

## 4. Runbook de incidente (minimal)

### Suspeita de fraude massiva
1. Verificar `audit_log` filtrando `action='fraud_check' AND metadata->>'action'='block'`.
2. Se volume anormal: investigar IPs/tenants de origem via `audit_log.ip_address`.
3. Pausar programa suspeito: `PATCH /api/programs/{id}/status` → `paused`.
4. Cancelar payouts pending afetados via `/saques` UI.
5. Notificar tenant afetado por e-mail.

### Vazamento de credencial JWT_SECRET
1. Gerar novo secret: `openssl rand -base64 64`.
2. Atualizar `/etc/indica-ai/secrets.env` na VPS.
3. `docker service update --force indica-ai_indica-ai-api` (rolling restart).
4. Forçar logout global: `UPDATE refresh_tokens SET revoked_at = now()`.
5. Comunicar usuários por e-mail (re-login obrigatório).

### Banco comprometido (acesso indevido)
1. Snapshot do estado atual (backup imediato pra preservar evidência).
2. Bloquear acesso de rede ao Postgres (firewall na VPS).
3. Inventariar via `audit_log` o que foi acessado/alterado.
4. Notificar ANPD em até 72h (LGPD art. 48) se houve PII vazada.
5. Forçar reset de senhas: zerar `password_hash` e disparar e-mails de magic link.

---

## 5. Pentest checklist (pré-GA)

Itens que precisam ser validados por pentester externo:

- [ ] Tentativa de SQL injection em todos os parâmetros de query (especialmente filters).
- [ ] Cross-tenant access: criar 2 tenants, tentar acessar recursos do outro com JWT do primeiro.
- [ ] Tentativa de elevação de privilégio: usuário comum tentando rotas `/api/admin/*`.
- [ ] CSRF: tentativa de POST com cookie de outro origin (verificar SameSite efetivo).
- [ ] Rate limit bypass: spoofing de XFF, distribuição de IPs.
- [ ] Tentativas de bypass do fraud engine (criar lead exatamente no threshold).
- [ ] Replay de magic link.
- [ ] Race condition em `payout.Confirm` simultaneous calls.
- [ ] Stored XSS em campos `notes`, `name`, `description` (renderização em e-mails ou export).
- [ ] Path traversal em filenames de LGPD export.

---

## 6. Referências

- [OWASP Top 10 2021](https://owasp.org/Top10/)
- LGPD Lei nº 13.709/2018, especialmente arts. 46-49 (segurança).
- Marco Civil da Internet — guarda de logs por 6 meses (art. 15).
- Política de cookies + privacidade: `/privacidade`.
- Política LGPD interna: `docs/lgpd-data-policy.md`.

---

*Este documento é vivo. Atualize sempre que adicionar mecanismo de segurança ou descobrir gap. Próxima revisão programada: antes do go-to-market.*
