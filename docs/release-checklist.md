# Release Regression Checklist — Indica AÍ!

**Quando usar:** antes de cada release que toque backend ou frontends. Roda em ~10 minutos contra produção (`api.181-215-134-11.sslip.io` + 3 apps Vercel).

**Quem roda:** quem está empurrando a release. Marque cada item com ✅/❌ no PR/issue antes de mergear.

---

## Pré-requisitos (uma vez por máquina)

- [ ] `curl`, `jq` instalados
- [ ] Browser com cookies habilitados (Chrome ou Firefox em modo normal, não anônimo — testa SameSite)
- [ ] Acesso à conta `consultoriadigitalboost@gmail.com` no dashboard (ou outra de teste)

---

## 1. CI verde

- [ ] Workflow **CI** (`.github/workflows/ci.yml`) verde no commit que vai virar release.
- [ ] Workflow **Deploy** (`.github/workflows/deploy.yml`) verde — confirma que `/healthz` retornou o SHA correto.
- [ ] `curl https://api.181-215-134-11.sslip.io/healthz` retorna `{"status":"ok","commit":"<sha-da-release>"}`.

## 2. Auth golden path

- [ ] **Register**: `POST /api/auth/register` com e-mail novo → 201 + cookie de sessão setado.
- [ ] **Login**: logout, `POST /api/auth/login` com a mesma conta → 200 + cookie.
- [ ] **/api/me**: retorna role, tenant_id, tenant_name corretos.
- [ ] **Logout**: `POST /api/auth/logout` → 200, próxima chamada autenticada retorna 401.
- [ ] **Magic link**: `POST /api/auth/magic-link` → 200; e-mail aparece em logs (ou inbox real se SMTP configurado).
- [ ] **Refresh token**: deixar o JWT expirar (15 min) com app aberto → frontend renova sozinho via `/api/auth/refresh`.

## 3. Programa lifecycle

- [ ] Dashboard `/programas/novo` — preencher form, salvar como **rascunho** → cria em status `draft`.
- [ ] Editar e **ativar** → status vai pra `active`.
- [ ] Pausar → `paused`. Reativar → `active`.
- [ ] Tentar criar programa sem nome → 400 com mensagem clara.
- [ ] Tentar criar programa com `rules.trigger` vazio → 400 ("trigger is required").

## 4. Parceiro + tracking

- [ ] Dashboard `/parceiros` — cadastrar novo parceiro com e-mail + telefone → 201, link `:slug` gerado.
- [ ] Abrir `https://api.181-215-134-11.sslip.io/r/<slug>` em browser → 302 pro destino do programa, `click_count` no parceiro incrementa.
- [ ] Cadastrar 2º parceiro com mesmo e-mail no mesmo programa → 409.
- [ ] Página `/parceiros` carrega lista com `clicks` e `referrals` corretos.

## 5. Lead + atribuição

- [ ] App parceiro: logar como o parceiro recém-criado (precisa ter user_id setado), entrar em `/parceiro/indicacoes/nova`, criar lead → 201.
- [ ] Dashboard `/indicacoes`: novo lead aparece com status `new`.
- [ ] Mudar status pra `qualified` → `closed` na UI → `closed_at` carimbado.

## 6. Comissões

- [ ] Backoffice: criar uma venda confirmada (manualmente via DB ou via worker se já tiver fluxo) que dispare reward.
- [ ] Dashboard `/comissoes`: reward aparece como `pending` com valor correto.
- [ ] Botão **Aprovar** → status `approved`, `approved_at` carimbado.
- [ ] Reward de outro parceiro: **Rejeitar** com motivo → `rejected_reason` salvo.

## 7. Saques manuais (MVP)

- [ ] Dashboard `/saques`: clicar **Gerar saques** → agrupa rewards aprovados em payouts `pending`.
- [ ] **Confirmar** um payout → status `processing` (significa "confirmado pra pagar fora da plataforma").
- [ ] **Marcar como pago** com URL de comprovante → status `paid`, comprovante salvo no metadata.
- [ ] **Cancelar** outro payout → status `cancelled`, com motivo.
- [ ] App parceiro `/parceiro/extrato`: parceiro vê o saque pago + saldo correto.

## 8. LGPD

- [ ] `POST /api/me/lgpd/export` autenticado → 202 com `request_id`.
- [ ] `GET /api/me/lgpd/requests` → o request aparece com status `completed` em ~2 s.
- [ ] Tentar segundo export imediato → 202 com o mesmo ID se ainda pendente, ou novo ID se o primeiro já completou.
- [ ] `POST /api/me/consents` com `policy_name=privacy_policy` → 201.
- [ ] `GET /api/me/consents` → lista 1 consent.
- [ ] `DELETE /api/me/consents/{id}` → 200, próxima leitura mostra `revoked_at`.
- [ ] `POST /api/me/lgpd/erase` em conta de teste → 202, `/api/me` passa a retornar `"USUÁRIO ANONIMIZADO"`.

## 9. Auditoria

- [ ] Dashboard `/auditoria` carrega — tab **Eventos** lista as ações dos passos 3-8 acima.
- [ ] Clicar em uma linha → expande mostrando user_agent, IP, old→new values.
- [ ] Tab **Antifraude** — se houve criação de lead, deve haver pelo menos uma decisão `ok`.
- [ ] StatCards no topo mostram contagens não-zero.

## 10. Sessões

- [ ] `GET /api/me/sessions` autenticado → retorna lista com pelo menos 1 entry (a corrente).
- [ ] Logar de outro browser/anônimo na mesma conta → 2 sessions na lista.
- [ ] `POST /api/me/sessions/revoke-all` → outro browser perde acesso na próxima chamada à API.

## 11. Páginas públicas

- [ ] `/termos` renderiza com sumário/seções e link de volta pra `/`.
- [ ] `/privacidade` idem.
- [ ] `/precos` lista os planos sem erros de hidratação.
- [ ] Lighthouse: performance ≥ 80 mobile, SEO ≥ 90, acessibilidade ≥ 90.

## 12. Health + observabilidade

- [ ] `https://api.181-215-134-11.sslip.io/healthz` responde em < 200 ms.
- [ ] Logs do API service (`docker service logs indica-ai_indica-ai-api --tail 50`): JSON estruturado, nenhuma stack trace recente.
- [ ] Worker (`docker service logs indica-ai_indica-ai-worker --tail 50`): job de payout diário sem erros.
- [ ] Rate limiter: 6 logins rápidos do mesmo IP → o 6º retorna 429.

## 13. Segurança

- [ ] `curl -I https://api.181-215-134-11.sslip.io/healthz` mostra `Strict-Transport-Security`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`.
- [ ] Tentar acessar `/api/programs` sem cookie → 401.
- [ ] CORS: preflight `OPTIONS /api/programs` com `Origin: https://maleficent.com` → não retorna `Access-Control-Allow-Origin`.

## 14. Rollback ready

- [ ] `docker service inspect indica-ai_indica-ai-api --format '{{.Spec.TaskTemplate.ContainerSpec.Image}}'` mostra o SHA atual.
- [ ] `docker image inspect indica-ai/api:previous --format '{{.Id}}'` resolve (rollback automático funciona).

---

## Como reportar problema encontrado

1. Linha do checklist + screenshot ou trecho do response.
2. Commit SHA testado (do `/healthz`).
3. Browser + sistema operacional.
4. Issue no GitHub com label `regression`.

---

*Última atualização: 2026-05-14 — checklist nascido junto com ETAPA 9.*
