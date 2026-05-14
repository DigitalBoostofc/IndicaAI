# Disaster Recovery Runbook — Indica AÍ!

**Última revisão:** 2026-05-14
**RTO alvo (MVP):** 4 horas
**RPO alvo (MVP):** 24 horas (backup diário às 03:30 UTC)
**Audiência:** quem está de plantão. Cada cenário tem detecção, mitigação imediata e procedimento de recuperação.

> ⚠️ **Sempre que executar uma ação destrutiva** (DELETE, DROP, force-push), confirme com mais um par de olhos. Se o cenário é "produção está fora", a pressa custa caro — 10 minutos pra alinhar > 4 horas pra desfazer.

---

## 0. Quick reference

| Recurso | Como acessar |
|---------|--------------|
| VPS Hostinger | `ssh -i ~/projetos/.ssh/id_ed25519 root@181.215.134.11` |
| Postgres CLI (na VPS) | `docker exec -it $(docker ps -qf name=indica-ai-db) psql -U indica -d indica_ai` |
| Backups | `/var/backups/indica-ai/indica_ai-*.sql.gz` (chmod 600, 14 dias) |
| Backup log | `/var/log/indica-ai-backup.log` |
| Secrets | `/etc/indica-ai/secrets.env` (chmod 600, owner root) |
| Healthz | `https://api.181-215-134-11.sslip.io/healthz` |
| GitHub Actions runner | systemd: `actions.runner.DigitalBoostofc-IndicaAI.indica-ai-vps.service` |
| Frontend (Vercel) | `dashboard.vercel.app` / `partner.vercel.app` / `public.vercel.app` |
| DNS atual | sslip.io (resolve IP literal no hostname) |

---

## 1. Postgres corrompido ou dados perdidos

### Detectar
- Endpoint começa a retornar 500 em queries que antes funcionavam.
- `docker exec ... psql ... -c "\dt"` falha ou mostra tabelas faltando.
- Logs do API mostram `relation "..." does not exist`.

### Mitigar imediatamente
1. Botar a API em modo manutenção: `docker service scale indica-ai_indica-ai-api=0` (frontend vai mostrar erro mas pelo menos não cria dados ruins).
2. Snapshotar o estado atual da DB pra preservar evidência:
   ```bash
   docker exec $(docker ps -qf name=indica-ai-db) \
     pg_dump -U indica indica_ai | gzip > /var/backups/indica-ai/forensic-$(date -u +%Y%m%d_%H%M).sql.gz
   ```

### Recuperar do backup mais recente
1. Confirmar qual backup vai ser usado: `ls -lh /var/backups/indica-ai/ | tail`.
2. Verificar integridade: `gzip -t <arquivo>.sql.gz`.
3. Drop & restore (operação destrutiva — só siga se o passo 2 do "mitigar" foi feito):
   ```bash
   CT=$(docker ps -qf name=indica-ai-db)
   docker exec $CT psql -U indica -d postgres -c "DROP DATABASE IF EXISTS indica_ai;"
   docker exec $CT psql -U indica -d postgres -c "CREATE DATABASE indica_ai;"
   gzip -dc /var/backups/indica-ai/indica_ai-YYYY-MM-DD_HHMMSS.sql.gz | \
     docker exec -i $CT psql -U indica -d indica_ai
   ```
4. Subir o API de volta: `docker service scale indica-ai_indica-ai-api=1`.
5. Smoke: `curl https://api.181-215-134-11.sslip.io/healthz` + login na UI.

### Comunicar
- Banner no `/configuracoes` (manualmente, frontend): "manutenção em curso — dados desde X foram restaurados".
- E-mail para `consultoriadigitalboost@gmail.com` listando o intervalo de tempo recuperado.

---

## 2. VPS Hostinger fica fora

### Detectar
- Monitor externo (UptimeRobot) dispara alerta de `/healthz` 5xx ou timeout.
- `ssh root@181.215.134.11` rejeita / fica pendurado.
- Painel Hostinger mostra a VM em estado "stopped" ou de migração.

### Mitigar
1. Tentar reboot pelo painel Hostinger.
2. Se a Hostinger reporta problema infra, abrir ticket e aguardar SLA deles (não temos failover ativo no MVP).
3. Frontends Vercel continuam servindo páginas estáticas e marketing — só /api fica indisponível. Banner no dashboard explicando.

### Recuperar (reconstrução completa, caso o disco morra)
1. Provisionar nova VPS (ubuntu 24.04, Docker pré-instalado se possível).
2. Restaurar setup base:
   ```bash
   # como root na nova VPS
   apt update && apt install -y docker.io git
   systemctl enable docker --now
   git clone https://github.com/DigitalBoostofc/IndicaAI.git /opt/indica-ai
   cd /opt/indica-ai

   # secrets — gerar novos (NÃO reusar os antigos se a VPS antiga foi comprometida)
   mkdir -p /etc/indica-ai
   cat > /etc/indica-ai/secrets.env <<ENV
   POSTGRES_PASSWORD=$(openssl rand -base64 32)
   JWT_SECRET=$(openssl rand -base64 64)
   ENV
   chmod 600 /etc/indica-ai/secrets.env
   ```
3. Subir o stack Swarm conforme `stack.yml` (precisa estar inicializado: `docker swarm init`).
4. Restaurar DB do backup mais recente (escopo: o backup precisa estar fora da VPS antiga — ver seção 5).
5. Apontar DNS / sslip.io pra novo IP. Se for sslip.io, o domínio é `api.<IP>.sslip.io` — basta reemitir o cert Let's Encrypt no Traefik.
6. Reinstalar o self-hosted runner (token novo do GitHub):
   ```bash
   gh api -X POST /repos/DigitalBoostofc/IndicaAI/actions/runners/registration-token --jq '.token'
   # depois seguir o instalador do runner como antes
   ```
7. Atualizar a memória/doc com novo IP se aplicável.

---

## 3. Self-hosted runner morto / deploy não funciona

### Detectar
- `gh run list --workflow=deploy.yml` mostra runs em `queued` indefinidamente.
- `systemctl status actions.runner.DigitalBoostofc-IndicaAI.indica-ai-vps.service` reporta failed.

### Mitigar / recuperar
```bash
systemctl restart actions.runner.DigitalBoostofc-IndicaAI.indica-ai-vps.service
systemctl status actions.runner.DigitalBoostofc-IndicaAI.indica-ai-vps.service
journalctl -u actions.runner.DigitalBoostofc-IndicaAI.indica-ai-vps.service --since "10 min ago" --no-pager
```

Se o runner perdeu credencial (raro):
```bash
cd /home/actions-runner/runner
sudo -u actions-runner ./config.sh remove --token <token-do-gh-api>
sudo -u actions-runner ./config.sh --url https://github.com/DigitalBoostofc/IndicaAI --token <novo-token> ...
```

Enquanto isso, deploy manual (break-glass) está documentado em [[reference_deploy_pipeline]] (memory).

---

## 4. Vercel down / build quebrou

### Detectar
- Vercel status page (status.vercel.com).
- Build no Vercel dashboard mostra failed.

### Mitigar
- Frontends estão CDN-cached pela Vercel; downtime de build não afeta tráfego existente, só novas releases.
- Se um build quebrou e fez rollback automático no Vercel: ok, sem ação.
- Se um build quebrou em rota crítica recém-deploy: usar Vercel UI pra fazer "Promote previous deployment".

---

## 5. Backup off-site

> ⚠️ **Gap conhecido do MVP:** os backups vivem no mesmo disco da VPS. Se o disco morre, o backup vai junto. **Próxima iteração** desta runbook:
> - configurar rclone pra subir os dumps diários pra Backblaze B2 (ou Cloudflare R2)
> - automatizar `aws s3 cp --no-progress` via cron
> - alvo: RPO independente de disco local

No MVP, mitigação parcial: **baixar manualmente** os backups críticos pra outra máquina semanalmente:
```bash
scp -i ~/projetos/.ssh/id_ed25519 \
  root@181.215.134.11:/var/backups/indica-ai/indica_ai-*.sql.gz \
  ~/backups-indica-ai/
```

---

## 6. Comprometimento de credenciais

### JWT_SECRET vazou
1. Gerar novo: `openssl rand -base64 64`.
2. Atualizar `/etc/indica-ai/secrets.env` na VPS.
3. `docker service update --force indica-ai_indica-ai-api`.
4. Invalidar todas as sessões existentes:
   ```sql
   UPDATE refresh_tokens SET revoked_at = now() WHERE revoked_at IS NULL;
   UPDATE sessions SET revoked_at = now() WHERE revoked_at IS NULL;
   ```
5. E-mail aos usuários informando re-login obrigatório.

### POSTGRES_PASSWORD vazou
1. Rotacionar dentro do container:
   ```bash
   CT=$(docker ps -qf name=indica-ai-db)
   NEW=$(openssl rand -base64 32)
   docker exec $CT psql -U indica -c "ALTER USER indica PASSWORD '$NEW';"
   ```
2. Atualizar `/etc/indica-ai/secrets.env` + restart de API e worker.
3. Verificar audit_log pra ações entre o vazamento e a rotação.

### SSH deploy key da VPS comprometida
1. `ssh-keygen -t ed25519 ...` novo keypair na VPS.
2. Remover a entrada antiga de `/root/.ssh/authorized_keys`.
3. Atualizar `VPS_SSH_KEY` no GitHub Actions secrets (não usado hoje, mas mantido como fallback).

---

## 7. Smoke pós-incidente

Após qualquer recovery, rodar o checklist resumido (subset do `docs/release-checklist.md`):

- [ ] `curl /healthz` retorna o SHA correto
- [ ] Login + /api/me funcionam (conta de teste)
- [ ] Criação de programa funciona
- [ ] Dashboard `/auditoria` carrega
- [ ] `audit_log` tem entrada `incident.recovery` registrada (se vc lembrar de inserir manualmente — bom rastro)

---

## 8. Quando escalar pra terceiro

- Hostinger: ticket via painel se infra deles.
- Vercel: support@vercel.com (free tier tem suporte por email).
- ANPD: incidentes envolvendo PII vazada — notificação obrigatória em **prazo razoável** (LGPD art. 48). E-mail: encarregado@anpd.gov.br.

---

*Esta runbook é viva. Sempre que um incidente acontecer, adicione/refine o cenário aqui. Próxima revisão programada: antes de GA (Go-to-Market).*
