# Indica AÍ! — Política de Dados e Conformidade LGPD (v1.0)

> Documento produzido por @security-chief | 2026-05-12  
> Consumidores diretos: @db-chief (schema), @backend-chief (implementação), @payments-chief (compliance fiscal)  
> **AVISO:** Seções marcadas com ⚠️ requerem validação jurídica antes do go-live. Nenhuma afirmação aqui constitui aconselhamento jurídico.

---

## 1. INVENTÁRIO DE DADOS PESSOAIS (PII Map)

Referência: LGPD art. 5º, I (dado pessoal) e art. 5º, II (dado sensível).

**Legenda de sensibilidade:**
- `DIRETO` — identifica a pessoa sem necessidade de cruzamento
- `INDIRETO` — identifica quando combinado com outros dados (art. 5º, I, in fine)
- `TÉCNICO` — não é dado pessoal por si só
- `SENSÍVEL` — art. 5º, II (origem racial, saúde, biometria, etc.) — **nenhum campo atual se enquadra; sinalizado como referência**

**Legenda de base legal (art. 7º):**
- `CONTRATO` — execução de contrato ou procedimentos preliminares (art. 7º, V)
- `CONSENTIMENTO` — consentimento do titular (art. 7º, I)
- `LEGAL` — obrigação legal ou regulatória (art. 7º, II)
- `LEGÍTIMO` — legítimo interesse do controlador ou terceiro (art. 7º, IX)

---

### 1.1 Tabela `tenant_members` (administradores da empresa cliente)

| Campo | Tipo PII | Finalidade | Base Legal | Notas |
|-------|----------|-----------|-----------|-------|
| `id` (UUID) | TÉCNICO | Chave primária interna | — | Não identifica diretamente |
| `tenant_id` | TÉCNICO | Vinculação ao tenant | — | — |
| `name` | DIRETO | Identificação do usuário | CONTRATO | Nome completo |
| `email` | DIRETO | Autenticação, comunicação | CONTRATO | Chave de login |
| `phone` | DIRETO | Comunicação, 2FA | CONTRATO | Opcional no MVP |
| `password_hash` | TÉCNICO | Segurança de acesso | CONTRATO | Argon2id; dado derivado, não é PII |
| `totp_secret` | TÉCNICO | 2FA | CONTRATO | Segredo criptográfico; não é PII |
| `role` | TÉCNICO | Controle de acesso | CONTRATO | `admin`, `member`, etc. |
| `last_login_at` | INDIRETO | Segurança, detecção de inatividade | LEGÍTIMO | Comportamental; PII indireta |
| `created_at` | TÉCNICO | Auditoria interna | LEGAL | — |
| `updated_at` | TÉCNICO | Auditoria interna | LEGAL | — |
| `deleted_at` | TÉCNICO | Soft-delete | LEGAL | — |

---

### 1.2 Tabela `partners` (parceiros/indicadores)

| Campo | Tipo PII | Finalidade | Base Legal | Notas |
|-------|----------|-----------|-----------|-------|
| `id` (UUID) | TÉCNICO | Chave primária | — | — |
| `tenant_id` | TÉCNICO | Multi-tenancy | — | — |
| `name` | DIRETO | Identificação, exibição no painel | CONTRATO | — |
| `email` | DIRETO | Autenticação (magic link), comunicação | CONTRATO | — |
| `phone_e164` | DIRETO | Comunicação, anti-fraude | CONTRATO | Formato normalizado E.164 |
| `phone_hash` | INDIRETO | Anti-fraude (auto-referral) | LEGÍTIMO | SHA-256 + salt; não reversível |
| `document_cpf` | DIRETO | Emissão de NF, compliance fiscal | LEGAL | ⚠️ Avaliar se é obrigatório no MVP ou apenas no payout |
| `pix_key` | DIRETO | Pagamento de comissões | CONTRATO | Pode ser CPF, CNPJ, email, telefone ou aleatória |
| `pix_key_type` | TÉCNICO | Processamento do payout | CONTRATO | `cpf`, `email`, `phone`, `random`, `cnpj` |
| `referral_slug` | TÉCNICO | Rastreamento de indicações | CONTRATO | Não identifica a pessoa sozinho |
| `program_id` | TÉCNICO | Vinculação ao programa | CONTRATO | — |
| `status` | TÉCNICO | Controle operacional | CONTRATO | `active`, `inactive`, `suspended` |
| `created_at`, `updated_at` | TÉCNICO | Auditoria | LEGAL | — |

**Nota para @db-chief:** Se `pix_key` for do tipo `cpf` ou `phone`, ela **duplica** o campo `document_cpf`/`phone_e164`. Considerar constraint de validação e tratar ambos como PII de mesma sensibilidade para fins de anonimização.

---

### 1.3 Tabela `leads` (pessoas indicadas)

| Campo | Tipo PII | Finalidade | Base Legal | Notas |
|-------|----------|-----------|-----------|-------|
| `id` (UUID) | TÉCNICO | Chave primária | — | — |
| `tenant_id`, `program_id`, `partner_id` | TÉCNICO | Atribuição | CONTRATO | — |
| `name` | DIRETO | Identificação | CONTRATO | Fornecido pelo parceiro ou pelo próprio lead |
| `email` | DIRETO | Comunicação, deduplicação | CONTRATO | — |
| `email_normalized` | DIRETO | Deduplicação técnica | LEGÍTIMO | Lowercase + trim; mesma PII do campo `email` |
| `phone_e164` | DIRETO | Comunicação, deduplicação | CONTRATO | — |
| `phone_e164_normalized` | DIRETO | Deduplicação técnica (UNIQUE) | LEGÍTIMO | Mesma PII do campo `phone_e164` |
| `phone_hash` | INDIRETO | Anti-fraude (auto-referral) | LEGÍTIMO | SHA-256 + salt global; não reversível |
| `referral_code` | TÉCNICO | Atribuição de indicação | CONTRATO | — |
| `status` | TÉCNICO | Pipeline de vendas | CONTRATO | `new`, `in_review`, `qualified`, `closed`, `lost` |
| `notes` | INDIRETO | Anotações do atendente | LEGÍTIMO | ⚠️ Pode conter PII livre (ex: "tem deficiência X", "mencionou renda") — instruir atendentes |
| `source` | TÉCNICO | Canal de origem | LEGÍTIMO | `whatsapp`, `form`, `manual` |
| `split_choice` (JSONB) | TÉCNICO | Escolha de recompensa pelo parceiro | CONTRATO | Não contém PII |
| `created_at`, `updated_at` | TÉCNICO | Auditoria | LEGAL | — |

**Nota crítica sobre leads:** O lead pode ter fornecido dados em contexto de WhatsApp (sem formulário com política de privacidade visível). ⚠️ A empresa cliente é corresponsável pelo tratamento; o fluxo de onboarding da empresa **deve** incluir orientação sobre como comunicar ao lead que seus dados serão tratados.

---

### 1.4 Tabela `click_events` (eventos de rastreamento)

| Campo | Tipo PII | Finalidade | Base Legal | Notas |
|-------|----------|-----------|-----------|-------|
| `id` (UUID) | TÉCNICO | Chave primária | — | — |
| `tenant_id`, `program_id`, `partner_id` | TÉCNICO | Atribuição | CONTRATO | — |
| `slug` | TÉCNICO | Identificação do link | CONTRATO | — |
| `visitor_id` (UUID) | INDIRETO | Rastreamento entre sessões | LEGÍTIMO | Gerado pelo sistema; PII indireta quando correlacionado com IP/UA |
| `fingerprint` | INDIRETO | Atribuição de baixa confiança | LEGÍTIMO | SHA-256(ip_/24 + ua + accept_lang); não identifica diretamente |
| `ip_inet` | DIRETO | Anti-fraude, geolocalização | LEGÍTIMO | Endereço IP é dado pessoal conforme ANPD/GDPR |
| `ua` (User Agent) | INDIRETO | Anti-fraude, analytics | LEGÍTIMO | Sozinho não identifica; em conjunto com IP sim |
| `accept_lang` | TÉCNICO | Contexto de sessão | LEGÍTIMO | Sozinho não é PII |
| `referer` | INDIRETO | Origem de tráfego | LEGÍTIMO | ⚠️ URLs podem conter PII (ex: `google.com/search?q=nome+da+pessoa`) |
| `utm` (JSONB) | TÉCNICO | Analytics de campanha | LEGÍTIMO | — |
| `occurred_at` | TÉCNICO | Timestamp do evento | LEGAL | — |

---

### 1.5 Tabela `payouts` (pagamentos de recompensas)

| Campo | Tipo PII | Finalidade | Base Legal | Notas |
|-------|----------|-----------|-----------|-------|
| `id` (UUID) | TÉCNICO | Chave primária | — | — |
| `tenant_id`, `partner_id`, `reward_id` | TÉCNICO | Vinculação | CONTRATO | — |
| `amount_brl` | TÉCNICO | Valor financeiro | LEGAL | Não é PII per se, mas integra registro fiscal |
| `pix_key` (snapshot) | DIRETO | Destino do pagamento | LEGAL + CONTRATO | Snapshot da chave no momento do pagamento; **não anonimizar se houver NF emitida** |
| `pix_key_type` | TÉCNICO | Processamento | CONTRATO | — |
| `external_tx_id` | TÉCNICO | Reconciliação financeira | LEGAL | ID do gateway (Asaas) |
| `status` | TÉCNICO | Fluxo de pagamento | CONTRATO | — |
| `confirmed_at` | TÉCNICO | Comprovação fiscal | LEGAL | — |
| `fiscal_doc_ref` | TÉCNICO | Referência documental | LEGAL | Número de NF ou comprovante |
| `created_at`, `updated_at` | TÉCNICO | Auditoria | LEGAL | — |

**Nota:** Payouts confirmados com nota fiscal emitida têm retenção mínima de **5 anos** por obrigação fiscal (Lei 9.430/96). A `pix_key` neste registro **não pode ser anonimizada** enquanto o prazo fiscal não expirar.

---

### 1.6 Tabela `consents` (registros de consentimento)

| Campo | Tipo PII | Finalidade | Base Legal | Notas |
|-------|----------|-----------|-----------|-------|
| `id` (UUID) | TÉCNICO | Chave primária | — | — |
| `tenant_id` | TÉCNICO | Multi-tenancy | — | — |
| `user_id` | INDIRETO | Vinculação ao titular | LEGAL | Referência; o registro permanece mesmo após anonimização do user |
| `user_type` | TÉCNICO | Tipo de titular | LEGAL | — |
| `policy_version` | TÉCNICO | Versão da política aceita | LEGAL | — |
| `scope` (array) | TÉCNICO | Escopos de consentimento | LEGAL | — |
| `accepted_at` | TÉCNICO | Timestamp do aceite | LEGAL | — |
| `revoked_at` | TÉCNICO | Timestamp da revogação | LEGAL | — |
| `ip_hash` | INDIRETO | Prova de aceite | LEGAL | Hash do IP; não armazenar IP em texto nesta tabela |
| `ua` | INDIRETO | Prova de aceite | LEGAL | User-agent do momento do aceite |

---

### 1.7 Tabela `audit_log` (log de auditoria)

| Campo | Tipo PII | Finalidade | Base Legal | Notas |
|-------|----------|-----------|-----------|-------|
| `id` (UUID) | TÉCNICO | Chave primária | — | — |
| `tenant_id` | TÉCNICO | Multi-tenancy | — | — |
| `actor_id` | INDIRETO | Identificação do agente | LEGAL | Referência; PII indireta |
| `actor_type` | TÉCNICO | Tipo de agente | LEGAL | — |
| `actor_ip` | DIRETO | Rastreabilidade de segurança | LEGAL | IP real no momento da ação |
| `action` | TÉCNICO | Tipo de evento | LEGAL | Namespaced: `pii.export`, `lead.create`, etc. |
| `target_type`, `target_id` | INDIRETO | Objeto da ação | LEGAL | Referência a PII |
| `metadata` (JSONB) | INDIRETO | Contexto adicional | LEGAL | ⚠️ Não incluir PII literal (nomes, emails) — apenas IDs e tipos |
| `created_at` | TÉCNICO | Timestamp imutável | LEGAL | — |

---

## 2. POLÍTICA DE RETENÇÃO

Referências legais: LGPD art. 15 e 16 (término do tratamento), Lei 9.430/96 (fiscal 5 anos), CTN art. 174 (prescrição tributária 5 anos), Lei 8.212/91 (previdenciário 10 anos para empregadores — não aplicável diretamente, mas referência para parceiros PJ).

| Dado | Entidade | Trigger de início | Prazo Mínimo | Prazo Máximo | Ação ao expirar |
|------|----------|-------------------|-------------|-------------|-----------------|
| PII de `tenant_members` (nome, email, telefone) | Usuário admin | `last_login_at` | Nenhum (sem obrigação legal isolada) | 5 anos após rescisão do contrato com o tenant | Anonimização parcial (manter ID para integridade referencial) |
| PII de `partners` (nome, email, telefone) | Parceiro | `last_active_at` ou data do último payout | 5 anos se houve pagamento com obrigação fiscal | 5 anos após último payout confirmado | Anonimização parcial; manter `id`, `tenant_id`, `program_id` |
| `pix_key` e `document_cpf` de `partners` | Parceiro | `payout.confirmed_at` do último pagamento | 5 anos (fiscal) | 10 anos (⚠️ consultar jurídico) | Anonimização do campo após prazo fiscal |
| PII de `leads` sem venda | Lead | `lead.created_at` | Nenhum | 2 anos | Anonimização total |
| PII de `leads` com venda confirmada | Lead | `sale.confirmed_at` | 5 anos (fiscal) | 5 anos | Anonimização parcial (manter agregados para analytics) |
| `ip_inet`, `visitor_id`, `ua`, `fingerprint` em `click_events` | Evento de rastreamento | `occurred_at` | Nenhum | 12 meses | Anular campos PII (SET NULL); manter linha com `tenant_id`, `program_id`, `partner_id`, `occurred_at` para analytics de volume |
| `referer` em `click_events` | Evento de rastreamento | `occurred_at` | Nenhum | 12 meses | SET NULL |
| `pix_key` em `payouts` (com NF) | Pagamento | `payout.confirmed_at` | 5 anos (Lei 9.430/96) | 10 anos (⚠️ consultar jurídico) | Manter íntegro durante prazo fiscal; anonimizar após |
| `payouts` sem NF / cancelados | Pagamento | `payout.created_at` | Nenhum | 2 anos | Anonimização do `pix_key` |
| Registros de `consents` | Consentimento | `consent.revoked_at` OU rescisão do contrato | 5 anos (prova de conformidade LGPD) | 10 anos (⚠️ consultar jurídico sobre prescrição civil) | Manter completo — são prova do consentimento prestado |
| `refresh_tokens` revogados | Sessão | `revoked_at` | Nenhum | 30 dias | Exclusão dura (`DELETE`) |
| `lgpd_requests` concluídas | Requisição LGPD | `completed_at` | 5 anos (prova de atendimento) | 10 anos | Anonimizar `requester_email` após prazo |
| `audit_log` geral | Log | `created_at` | 5 anos (rastreabilidade de segurança) | 10 anos | Anonimizar `actor_ip` e PII em `metadata`; manter estrutura |
| Dados do tenant após cancelamento de plano | Tenant | `contract.ended_at` | 90 dias (período de grace para exportação) | 90 dias + 5 anos para dados fiscais | Anonimização total dos dados pessoais; manter registros fiscais |

**Implementação recomendada:** Job River `RetentionSweepJob` executado diariamente, varrendo cada critério acima com query `WHERE <trigger_col> < NOW() - INTERVAL '<prazo>'`.

---

## 3. ESTRUTURA DE CONSENTIMENTO

### 3.1 Schema da tabela `consents`

```sql
CREATE TABLE consents (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       uuid        NOT NULL REFERENCES tenants(id),

    -- Titular do consentimento
    user_id         uuid,           -- NULL quando coletado antes do cadastro (ex: lead via form)
    user_type       text        NOT NULL CHECK (user_type IN ('tenant_member', 'partner', 'lead', 'visitor')),
    visitor_id      uuid,           -- preencher quando user_id for NULL (correlação com click_events)

    -- Política e versão
    policy_version  text        NOT NULL,  -- ex: 'privacy-v1.2', 'terms-v2.0'
    policy_hash     text        NOT NULL,  -- SHA-256 do texto completo da política aceita

    -- Escopos granulares (array de strings)
    -- Valores possíveis: 'operational', 'marketing_email', 'marketing_whatsapp',
    --                    'analytics_cookies', 'third_party_sharing'
    scopes          text[]      NOT NULL DEFAULT '{"operational"}',

    -- Evidência do aceite
    accepted_at     timestamptz,    -- NULL = não aceito / pendente
    revoked_at      timestamptz,    -- NULL = ativo

    -- Prova técnica do aceite (sem armazenar IP em texto puro)
    ip_hash         text,           -- SHA-256(ip + salt_global) — não reversível
    ua              text,           -- User-Agent do momento do aceite
    acceptance_method text,         -- 'form_checkbox', 'magic_link_click', 'api_explicit'

    -- Controle
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),

    -- Garantir que não haja duplicata de escopo ativo por usuário + versão
    CONSTRAINT consents_unique_active
        UNIQUE NULLS NOT DISTINCT (tenant_id, user_id, policy_version, revoked_at)
);

CREATE INDEX consents_user_idx        ON consents(user_id, tenant_id) WHERE revoked_at IS NULL;
CREATE INDEX consents_visitor_idx     ON consents(visitor_id) WHERE user_id IS NULL AND revoked_at IS NULL;
CREATE INDEX consents_policy_idx      ON consents(policy_version, tenant_id);
```

### 3.2 Rastreamento de consentimento por finalidade

Cada **escopo** mapeia para uma finalidade específica de tratamento:

| Escopo | Finalidade | Base legal alternativa se não concedido |
|--------|-----------|----------------------------------------|
| `operational` | Execução do programa de indicação (criação de lead, cálculo de comissão) | CONTRATO — não pode ser revogado sem encerrar a conta |
| `marketing_email` | Envio de e-mails de campanha, boletins | CONSENTIMENTO — obrigatório |
| `marketing_whatsapp` | Notificações via WhatsApp não-operacionais | CONSENTIMENTO — obrigatório |
| `analytics_cookies` | Cookie `_iaref` em modo analytics, pixels de terceiros | CONSENTIMENTO — obrigatório |
| `third_party_sharing` | Compartilhamento de dados com integrações além de gateways de pagamento | CONSENTIMENTO — obrigatório |

**Consentimento operacional** (`operational`) é condição do contrato de serviço — não é consentimento LGPD puro, é base legal de execução de contrato (art. 7º, V). O usuário não pode "recusar" este escopo sem encerrar sua participação.

### 3.3 Versionamento de política

- Mudanças **não-materiais** (ortografia, clareza): incremento minor (`v1.1 → v1.2`). Consents existentes permanecem válidos.
- Mudanças **materiais** (nova finalidade, novo dado coletado): incremento major (`v1.x → v2.0`). **Re-coleta de consentimento obrigatória** para todos os titulares afetados (job `ConsentRenewalJob`).
- A tabela `policy_documents` deve armazenar o texto completo de cada versão com `policy_hash` correspondente.

### 3.4 Fluxo de revogação e cascata

Quando um titular revoga consentimento de um escopo não-operacional:

```
POST /me/consent/revoke
Body: { "scopes": ["marketing_email", "analytics_cookies"] }

1. UPDATE consents SET revoked_at = NOW() WHERE user_id = $uid AND scope ∩ $scopes != ∅
2. INSERT INTO audit_log (action='consent.revoked', ...)
3. Enfileirar ConsentRevocationJob:
   a. marketing_email revogado → desinscrever de todas as listas de e-mail (Resend API)
   b. analytics_cookies revogado → nenhuma ação retroativa em click_events históricos
                                   (dados já coletados sob base de legítimo interesse para anti-fraude)
   c. third_party_sharing revogado → revogar tokens em integrações (⚠️ depende de cada integração)
4. Retornar confirmação ao titular com timestamp
```

**Importante:** A revogação de consentimento **não aciona anonimização automática**. Anonimização é um direito distinto (art. 18, IV). O titular deve solicitar separadamente.

---

## 4. DIREITOS DO TITULAR (art. 18 LGPD)

### 4.1 Tabela `lgpd_requests`

```sql
CREATE TABLE lgpd_requests (
    id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id            uuid        NOT NULL REFERENCES tenants(id),

    -- Identificação do solicitante
    requester_type       text        NOT NULL CHECK (requester_type IN ('tenant_member', 'partner', 'lead')),
    requester_id         uuid,           -- NULL se usuário já deletado
    requester_email      text        NOT NULL, -- armazenar para validação mesmo pós-deleção

    -- Tipo e estado da solicitação
    request_type         text        NOT NULL CHECK (request_type IN (
                             'access', 'correction', 'anonymization',
                             'erasure', 'portability', 'consent_revocation',
                             'data_confirmation', 'opposition'
                         )),
    status               text        NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending', 'identity_pending',
                                               'processing', 'completed', 'rejected')),
    rejection_reason     text,

    -- Validação de identidade do solicitante
    identity_token       text,           -- token de magic link enviado por email
    identity_token_hash  text,           -- hash do token (armazenar apenas o hash)
    identity_verified_at timestamptz,
    identity_method      text,           -- 'magic_link', 'email_code'

    -- Dados da resposta (para access/portability)
    download_url         text,           -- URL R2 assinado
    download_expires_at  timestamptz,

    -- Anotações internas
    notes                text,
    completed_at         timestamptz,

    created_at           timestamptz NOT NULL DEFAULT now(),
    updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX lgpd_requests_requester_idx ON lgpd_requests(requester_email, tenant_id);
CREATE INDEX lgpd_requests_status_idx    ON lgpd_requests(status, created_at);
```

### 4.2 Fluxos por direito

#### 4.2.1 Acesso (art. 18, I e II) — Exportação ZIP

```
Endpoint: POST /lgpd/requests
Body: { "request_type": "access" }

SLA: 15 dias corridos (⚠️ a LGPD não define prazo explícito para resposta ao titular;
     seguir boas práticas ANPD e precedentes GDPR de 30 dias)

Fluxo:
1. Criar lgpd_requests (status=identity_pending)
2. Enviar magic link para requester_email via Resend
3. Titular clica no link → PATCH /lgpd/requests/:id/verify
4. Validar token hash → UPDATE identity_verified_at, status=processing
5. Enfileirar ExportDataJob (workers/lgpd/export.go)
6. Job coleta dados de todas as tabelas onde user_id = requester_id:
   - tenant_members / partners / leads (dados cadastrais)
   - click_events WHERE visitor_id IN (known_visitor_ids)
   - consents
   - payouts
   - referrals/attributions
   - lgpd_requests próprias
7. Gerar ZIP estruturado com subpastas por entidade + README.txt
8. Upload para Cloudflare R2 (bucket privado lgpd-exports)
9. Gerar URL assinada válida 7 dias
10. UPDATE lgpd_requests SET download_url=..., download_expires_at=..., status=completed
11. Enviar email ao titular com link de download
12. INSERT audit_log (action='pii.export', target_type='user', target_id=requester_id)
```

#### 4.2.2 Correção (art. 18, III)

```
Endpoint: PATCH /me/profile (para campos próprios) OU
          POST /lgpd/requests com request_type='correction' e body descrevendo a correção

SLA: 15 dias

Fluxo para correção auto-serviço (/me/profile):
1. Titular autenticado atualiza nome, email, telefone
2. Backend valida, persiste, invalida cache
3. INSERT audit_log (action='pii.corrected', metadata={fields_changed: [...]})

Fluxo para correção de dados não acessíveis ao titular (ex: dados de lead
 inseridos manualmente por atendente):
1. Solicitação via POST /lgpd/requests
2. Validação de identidade via magic link
3. Equipe responsável analisa e corrige manualmente
4. UPDATE lgpd_requests (status=completed, notes=...)
5. INSERT audit_log
```

#### 4.2.3 Anonimização (art. 18, IV)

```
Endpoint: POST /lgpd/requests
Body: { "request_type": "anonymization" }

SLA: 15 dias

Fluxo:
1. Validação de identidade via magic link
2. Enfileirar AnonymizeDataJob (workers/lgpd/anonymize.go)
3. Job executa anonymize_user(requester_id) — ver §5
4. Invalidar todas as sessões ativas do usuário
5. Resposta ao titular confirmando a anonimização
6. INSERT audit_log (action='pii.anonymized')

Restrição: dados com obrigação fiscal não são anonimizados até expirar o prazo (ver §2)
```

#### 4.2.4 Eliminação (art. 18, VI)

```
Endpoint: POST /lgpd/requests
Body: { "request_type": "erasure" }

SLA: 15 dias

Fluxo:
1. Validação de identidade
2. Verificar se há dados com obrigação fiscal pendente:
   - Se sim: informar ao titular que anonimização será aplicada aos dados não-fiscais;
             dados fiscais serão retidos pelo prazo legal (art. 16, I LGPD — exceção)
   - Se não: prosseguir com anonymize_user() + exclusão dura de dados sem retenção
3. Revogar todos os consentimentos ativos
4. Invalidar sessões
5. Desinscrever de listas de marketing
6. INSERT audit_log (action='pii.erased')
7. Confirmar ao titular
```

#### 4.2.5 Portabilidade (art. 18, V)

```
Endpoint: POST /lgpd/requests
Body: { "request_type": "portability" }

SLA: 15 dias

Formato de saída: JSON estruturado (não ZIP)

Estrutura do JSON de portabilidade:
{
  "exported_at": "2026-05-12T10:00:00Z",
  "format_version": "1.0",
  "data": {
    "profile": { "name": "...", "email": "...", "phone": "..." },
    "referrals": [{ "id": "...", "program": "...", "status": "...", "created_at": "..." }],
    "rewards": [{ "type": "...", "amount": "...", "status": "...", "date": "..." }],
    "payouts": [{ "amount_brl": "...", "method": "pix", "confirmed_at": "..." }],
    "consents": [{ "scope": [...], "accepted_at": "...", "policy_version": "..." }]
  }
}

Upload no R2, URL assinada 7 dias, mesmo fluxo do acesso.
```

#### 4.2.6 Revogação de Consentimento (art. 18, IX)

Coberto na §3.4 — acima. Endpoint: `POST /me/consent/revoke`.

---

## 5. ANONIMIZAÇÃO vs EXCLUSÃO DURA

### 5.1 O que NÃO pode ser deletado

| Dado | Razão da retenção | Prazo |
|------|------------------|-------|
| `payouts` com `fiscal_doc_ref` preenchido | Obrigação fiscal (Lei 9.430/96) | 5 anos mínimo |
| `payouts.pix_key` enquanto há nota fiscal associada | Elemento do documento fiscal | Idem |
| Registros em `consents` | Prova de conformidade LGPD (art. 37) | 5–10 anos |
| Estrutura de `referrals`/`attributions` (sem PII) | Integridade referencial de comissões | Enquanto houver disputa possível |
| `audit_log` inteiro | Rastreabilidade de segurança e LGPD | 5 anos |
| `lgpd_requests` concluídas | Prova de atendimento aos direitos | 5 anos |

### 5.2 Campo-a-campo: anonimização de `partners`

| Campo | Ação | Valor resultante |
|-------|------|-----------------|
| `name` | Substituição | `'PARCEIRO ANONIMIZADO'` |
| `email` | Hash irreversível | `anon_{SHA-256(email + ANON_SALT)[:16]}@anonimizado.invalid` |
| `phone_e164` | NULL | `NULL` |
| `phone_hash` | Manter | Mantém (não é PII reversível) |
| `document_cpf` | NULL (se prazo fiscal expirado) | `NULL` |
| `pix_key` | NULL (se prazo fiscal expirado) | `NULL` |
| `pix_key_type` | Manter | Mantém (dado técnico) |
| `referral_slug` | Manter | Mantém (não é PII) |
| `status` | Forçar | `'anonymized'` |

### 5.3 Campo-a-campo: anonimização de `tenant_members`

| Campo | Ação | Valor resultante |
|-------|------|-----------------|
| `name` | Substituição | `'USUÁRIO ANONIMIZADO'` |
| `email` | Hash irreversível | `anon_{SHA-256(email + ANON_SALT)[:16]}@anonimizado.invalid` |
| `phone` | NULL | `NULL` |
| `password_hash` | Invalidar | `'ANONIMIZADO'` (string inválida para Argon2) |
| `totp_secret` | NULL | `NULL` |
| `last_login_at` | NULL | `NULL` |

### 5.4 Campo-a-campo: anonimização de `leads`

| Campo | Ação | Valor resultante |
|-------|------|-----------------|
| `name` | NULL | `NULL` |
| `email` | Hash irreversível | `anon_{SHA-256(email + ANON_SALT)[:16]}@anonimizado.invalid` |
| `email_normalized` | Hash irreversível | Idem |
| `phone_e164` | NULL | `NULL` |
| `phone_e164_normalized` | NULL | `NULL` |
| `phone_hash` | Manter | Mantém (não é PII reversível) |
| `notes` | NULL | `NULL` |
| `status` | Manter | Mantém (dado de processo) |
| `source` | Manter | Mantém (dado técnico) |

### 5.5 Campo-a-campo: purga de PII em `click_events` (após 12 meses)

| Campo | Ação |
|-------|------|
| `ip_inet` | `SET NULL` |
| `visitor_id` | `SET NULL` |
| `ua` | `SET NULL` |
| `fingerprint` | `SET NULL` |
| `referer` | `SET NULL` |
| `accept_lang` | `SET NULL` |
| Demais campos | Manter (analytics de volume por programa/parceiro) |

### 5.6 Pseudo-código SQL: `anonymize_user(p_user_id UUID, p_user_type TEXT)`

```sql
CREATE OR REPLACE FUNCTION anonymize_user(
    p_user_id   UUID,
    p_user_type TEXT  -- 'partner' | 'tenant_member' | 'lead'
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER  -- executa como owner para contornar RLS na operação de admin
AS $$
DECLARE
    v_anon_email TEXT;
BEGIN
    -- 1. Gerar email anonimizado (hash irreversível)
    v_anon_email := 'anon_' ||
                    LEFT(encode(sha256((p_user_id::text || current_setting('app.anon_salt'))::bytea), 'hex'), 16) ||
                    '@anonimizado.invalid';

    -- 2. Processar por tipo
    IF p_user_type = 'partner' THEN
        UPDATE partners SET
            name          = 'PARCEIRO ANONIMIZADO',
            email         = v_anon_email,
            phone_e164    = NULL,
            document_cpf  = NULL,
            -- pix_key: só anular se prazo fiscal expirado (verificar externamente antes de chamar)
            pix_key       = NULL,
            status        = 'anonymized',
            updated_at    = now()
        WHERE id = p_user_id;

    ELSIF p_user_type = 'tenant_member' THEN
        UPDATE tenant_members SET
            name           = 'USUÁRIO ANONIMIZADO',
            email          = v_anon_email,
            phone          = NULL,
            password_hash  = 'ANONIMIZADO',
            totp_secret    = NULL,
            last_login_at  = NULL,
            updated_at     = now()
        WHERE id = p_user_id;

    ELSIF p_user_type = 'lead' THEN
        UPDATE leads SET
            name                  = NULL,
            email                 = v_anon_email,
            email_normalized      = v_anon_email,
            phone_e164            = NULL,
            phone_e164_normalized = NULL,
            notes                 = NULL,
            updated_at            = now()
        WHERE id = p_user_id;
    END IF;

    -- 3. Invalidar sessões ativas
    DELETE FROM refresh_tokens WHERE user_id = p_user_id;

    -- 4. Revogar consentimentos ativos
    UPDATE consents
    SET revoked_at = now(), updated_at = now()
    WHERE user_id = p_user_id AND revoked_at IS NULL;

    -- 5. Registrar no audit_log (INSERT — tabela append-only)
    INSERT INTO audit_log (tenant_id, actor_id, actor_type, action, target_type, target_id, metadata)
    SELECT
        (SELECT tenant_id FROM partners WHERE id = p_user_id
         UNION SELECT tenant_id FROM tenant_members WHERE id = p_user_id
         UNION SELECT tenant_id FROM leads WHERE id = p_user_id
         LIMIT 1),
        NULL,           -- ação de sistema (sem actor humano)
        'system',
        'pii.anonymized',
        p_user_type,
        p_user_id,
        jsonb_build_object('triggered_by', 'lgpd_request', 'timestamp', now());

END;
$$;
```

**Nota para @db-chief:** A variável `app.anon_salt` deve ser um segredo configurado via `SET LOCAL` no início de cada transação de anonimização, nunca hardcoded. Manter o salt garante consistência de hash; comprometê-lo não expõe PII pois SHA-256 é unidirecional.

---

## 6. AUDIT_LOG — Estrutura e Imutabilidade

### 6.1 Schema completo

```sql
CREATE TABLE audit_log (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   uuid        REFERENCES tenants(id),     -- NULL para ações de saas_admin
    actor_id    uuid,                                    -- NULL para ações de sistema/job
    actor_type  text        NOT NULL
                    CHECK (actor_type IN ('tenant_member', 'partner', 'saas_admin', 'system', 'job')),
    actor_ip    inet,                                    -- IP real no momento da ação
    action      text        NOT NULL,                    -- namespaced: 'pii.export', 'lead.create', etc.
    target_type text,                                    -- 'user', 'lead', 'partner', 'payout', etc.
    target_id   uuid,
    metadata    jsonb,                                   -- contexto adicional; NUNCA PII literal
    created_at  timestamptz NOT NULL DEFAULT now()       -- sem updated_at: registro é imutável
);

-- Índices para consulta forense e compliance
CREATE INDEX audit_log_tenant_idx   ON audit_log(tenant_id, created_at DESC);
CREATE INDEX audit_log_actor_idx    ON audit_log(actor_id, created_at DESC);
CREATE INDEX audit_log_target_idx   ON audit_log(target_type, target_id, created_at DESC);
CREATE INDEX audit_log_action_idx   ON audit_log(action, created_at DESC);

-- SEM updated_at, SEM deleted_at — registro não pode ser alterado nem removido pela app
```

### 6.2 Eventos obrigatórios de log

| Evento (`action`) | Gatilho | Campos obrigatórios no `metadata` |
|-------------------|---------|----------------------------------|
| `pii.export` | ExportDataJob concluído | `request_id`, `file_size_bytes`, `download_expires_at` |
| `pii.anonymized` | anonymize_user() executado | `triggered_by` (lgpd_request ou retention_sweep), `request_id` |
| `pii.erased` | EraseDataJob concluído | `triggered_by`, `request_id`, `tables_affected` |
| `auth.login` | Login bem-sucedido | `user_type`, `method` (password/magic_link) |
| `auth.login_failed` | Tentativa de login falha | `reason`, `attempts_count` |
| `auth.token_rotation_theft` | Uso de refresh token já revogado | `family_id`, `jti_attempted` |
| `admin.cross_tenant_access` | saas_admin acessa dados de um tenant | `tenant_accessed`, `resource_type`, `resource_id` |
| `permission.changed` | Alteração de role de um usuário | `old_role`, `new_role`, `changed_by` |
| `lead.created` | Novo lead inserido | `source` (whatsapp/form/manual), `partner_id` |
| `lead.status_changed` | Mudança de status do lead | `old_status`, `new_status` |
| `payout.confirmed` | Payout processado | `amount_brl`, `method`, `external_tx_id` |
| `payout.failed` | Falha no pagamento | `reason`, `attempt_number` |
| `consent.accepted` | Consentimento registrado | `policy_version`, `scopes` |
| `consent.revoked` | Consentimento revogado | `scopes_revoked`, `triggered_by` |
| `lgpd_request.created` | Nova solicitação LGPD | `request_type`, `requester_type` |
| `lgpd_request.completed` | Solicitação atendida | `request_type`, `duration_hours` |
| `api_key.created` / `.revoked` | Gestão de chaves de API | `key_prefix` (primeiros 8 chars) |
| `webhook.delivery_failed` | Falha na entrega de webhook | `endpoint_domain`, `attempt`, `http_status` |
| `fraud.flag` | Flag de fraude detectada | `reason`, `score`, `entity_type`, `entity_id` |

### 6.3 Garantia de imutabilidade

```sql
-- Criar role dedicada para a aplicação (sem permissão de UPDATE/DELETE no audit_log)
GRANT INSERT, SELECT ON audit_log TO api_user;
-- Explicitamente NÃO conceder:
-- REVOKE UPDATE, DELETE ON audit_log FROM api_user;
-- REVOKE UPDATE, DELETE ON audit_log FROM PUBLIC;

-- Role do DBA (saas_admin_dba) pode SELECT e INSERT, mas DELETE só via procedure auditada:
CREATE OR REPLACE PROCEDURE admin_delete_audit_log_entry(p_id UUID, p_reason TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Registra a própria deleção ANTES de deletar (paradoxo tratado por ordem)
    INSERT INTO audit_log (actor_type, action, target_type, target_id, metadata)
    VALUES ('saas_admin', 'audit_log.entry_deleted', 'audit_log', p_id,
            jsonb_build_object('reason', p_reason, 'deleted_at', now()));
    DELETE FROM audit_log WHERE id = p_id;
END;
$$;
-- Apenas DBA possui EXECUTE nessa procedure; uso deve ser excepcional e justificado

-- Trigger para bloquear UPDATE na tabela (defesa extra):
CREATE OR REPLACE FUNCTION audit_log_immutable() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'audit_log é imutável — operação bloqueada';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_log_no_update
    BEFORE UPDATE ON audit_log
    FOR EACH ROW EXECUTE FUNCTION audit_log_immutable();
```

### 6.4 Paradoxo de retenção do audit_log

O `audit_log` contém PII (`actor_ip`, referências em `metadata`). A retenção do log por 5–10 anos é necessária para rastreabilidade de segurança e prova de conformidade LGPD. A solução:

1. **Anonimizar `actor_ip`** após 2 anos (SET NULL) via `RetentionSweepJob`
2. **Nunca incluir PII literal** em `metadata` — apenas IDs que referenciam registros já anonimizados
3. O `actor_id` (UUID) pode permanecer: referencia um registro já anonimizado, sem re-identificação
4. Manter `action`, `target_type`, `target_id` e `created_at` indefinidamente para rastreabilidade

---

## 7. COOKIES E TRACKING

### 7.1 O cookie `_iaref` é PII?

**Resposta:** Sim — é **dado pessoal indireto** conforme LGPD art. 5º, I.

**Fundamentação:**
- O `_iaref` contém `visitor_id:slug:ts:hmac`. O `visitor_id` é um UUID gerado pelo sistema.
- Isolado, o `visitor_id` não identifica uma pessoa natural diretamente.
- Porém, quando correlacionado com registros em `click_events` (que contêm `ip_inet`, `ua`, `fingerprint`), torna-se possível identificar o visitante — satisfazendo o critério de "identificável" do art. 5º, I.
- A ANPD e a doutrina majoritária tratam identificadores persistentes de rastreamento como dados pessoais quando há possibilidade razoável de re-identificação cruzada.
- **Conclusão:** O cookie `_iaref` é tratado como dado pessoal para todos os fins desta política.

### 7.2 Base legal por finalidade de tracking

| Finalidade | Necessidade do `_iaref` | Base Legal | Exige Consent Gate? |
|-----------|------------------------|-----------|---------------------|
| Atribuição de indicação (operacional) | Essencial — sem ele a janela de atribuição falha | CONTRATO (art. 7º, V) + LEGÍTIMO (art. 7º, IX) | Não — essencial para o serviço contratado |
| Detecção de auto-referral / fraude | Alta — correlaciona clique com conversão | LEGÍTIMO (art. 7º, IX) — anti-fraude é interesse legítimo | Não — necessário para proteger integridade do sistema |
| Analytics de campanha (relatórios de conversão) | Moderada — pode ser feito com dados agregados | CONSENTIMENTO (art. 7º, I) | **Sim** — analytics beneficia primariamente o controlador |
| Re-marketing / segmentação | Nula no MVP | CONSENTIMENTO (art. 7º, I) | **Sim** — e não está no escopo do MVP |

⚠️ **Consultar jurídico** sobre a validade do "legítimo interesse" para atribuição operacional: a ANPD ainda não emitiu orientação definitiva sobre se atribuição de indicação se enquadra como interesse legítimo suficiente para dispensar consentimento de cookie.

### 7.3 Comportamento do Widget JS no site do cliente

O widget JS (`web/packages/tracking/`) instalado no site da empresa cliente deve seguir estas regras:

**Modo Essencial (sem consent gate — base: contrato/legítimo interesse):**
- Ler `?ref=` da URL e preencher campo oculto `referral_code`
- Ler cookie `_iaref` existente para atribuição
- Enviar `{ visitor_id, referral_code }` para `POST /api/events/click` — sem IP (servidor captura), sem UA completo
- **Não** criar cookies novos sem consentimento para analytics

**Modo Analytics (requer consentimento explícito):**
- Criar/renovar cookie `_iaref` com `Max-Age` completo
- Enviar `ua`, `accept_lang`, `referer` completos
- Ativar apenas após `window.indicaAI.consent('analytics_cookies')`

**Implementação obrigatória no widget:**
```typescript
// web/packages/tracking/src/index.ts
export function init(config: WidgetConfig) {
  // Sempre: ler ref da URL e atribuir (essencial)
  const refCode = new URLSearchParams(window.location.search).get('ref');
  if (refCode) setHiddenInputs(refCode);
  
  const existingVisitorId = readCookieHMAC('_iaref');
  
  // Analytics: só com consentimento
  if (config.analyticsConsent === true) {
    const visitorId = existingVisitorId ?? generateUUIDv7();
    setSignedCookie('_iaref', buildCookieValue(visitorId, refCode));
    postClickEvent({ visitorId, refCode, ua: navigator.userAgent, referer: document.referrer });
  } else {
    // Sem consentimento: enviar apenas referral_code, sem criar cookie novo
    if (refCode) postClickEvent({ refCode }); // backend não grava visitor_id
  }
}
```

**Nota ao @frontend-chief:** O painel da empresa deve ter seção de configuração do widget onde o tenant escolhe o modo (essencial vs analytics), com aviso sobre implicações LGPD. A documentação pública do widget deve incluir instruções de implementação do consent gate.

---

## 8. DPO E CANAL DE CONTATO

### 8.1 Obrigação legal (art. 41 LGPD)

A nomeação formal de DPO (Encarregado) é obrigatória para controladores e operadores. Para o MVP, o papel pode ser acumulado pelo fundador/responsável legal da empresa, com canal de contato disponível publicamente.

### 8.2 O que deve existir no produto no go-live

| Elemento | Descrição | Implementação |
|----------|-----------|--------------|
| Endpoint `GET /lgpd/contact` | Página pública com informações de contato do DPO e link para exercício de direitos | Rota pública na API, retorna JSON e redireciona para página |
| Página pública `/privacidade` | Política de privacidade atualizada, legível, com versão e data | Next.js, estática, indexada por SEO |
| Página pública `/termos` | Termos de uso e condições do programa de indicação | Next.js, estática |
| Email dedicado | `privacidade@indica.ai` (ou equivalente) | Alias que chega ao DPO/responsável |
| Formulário de solicitação LGPD | Link para `POST /lgpd/requests` com formulário amigável | Página `/meus-dados` no painel do parceiro e da empresa |
| Banner de cookies no widget | Consent gate para cookies analytics | Widget JS (§7.3) |
| Identificação do controlador | Na política de privacidade: razão social, CNPJ, endereço do controlador | Página `/privacidade` |

### 8.3 Responsabilidade por tenants (empresa cliente)

O Indica AÍ! é **operador** dos dados dos leads e parceiros quando age por instrução da empresa cliente. A empresa cliente é a **controladora** em relação aos seus leads e parceiros. O contrato de SaaS **deve** incluir cláusula de DPA (Data Processing Agreement) estabelecendo:
- Finalidades autorizadas do tratamento
- Instrução para subprocessadores (Asaas, Resend, Cloudflare)
- Obrigação de notificação em caso de incidente
- Direitos de auditoria da controladora sobre o operador

⚠️ **Consultar jurídico** para redigir o DPA antes do go-live.

---

## 9. RISCOS RESIDUAIS (Top 5)

### R01 — Transferência Internacional de Dados sem DPA formalizado

**Descrição:** Vercel (EUA), Cloudflare (EUA/global), Grafana Cloud, Sentry, Resend e Asaas processam dados pessoais de titulares brasileiros. A LGPD art. 33 permite transferência apenas para países com "proteção adequada" (nenhum país foi reconhecido pela ANPD até a data deste documento) ou mediante mecanismos alternativos (cláusulas contratuais padrão, normas corporativas globais).

**Mitigação proposta:**
- Assinar DPA (Data Processing Agreement / Cláusulas Contratuais Padrão) com cada subprocessador antes do go-live
- Preferir provedores com centro de dados no Brasil quando possível (ex: Fly.io GRU já cobre a API)
- Documentar o mapeamento de fluxo internacional no Registro de Operações (art. 37 LGPD)
- ⚠️ **Consultar jurídico** — risco de autuação pela ANPD; nível de risco: ALTO

---

### R02 — Dados de Menores sem Mecanismo de Verificação de Idade

**Descrição:** A LGPD art. 14 proíbe o tratamento de dados de crianças (menores de 12 anos) sem consentimento parental específico, e trata adolescentes (12–17 anos) com cautela adicional. O sistema não verifica a idade de parceiros ou leads. Programas em clínicas pediátricas, escolas ou academias infantis podem capturar dados de menores.

**Mitigação proposta:**
- Adicionar campo de declaração de maioridade no cadastro de parceiros ("Declaro ter 18 anos ou mais")
- Incluir nos Termos de Uso restrição explícita de uso por menores
- Orientar empresas clientes (via onboarding e DPA) a não cadastrar menores como parceiros ou leads
- Fase 2: implementar verificação de data de nascimento no cadastro de parceiros
- ⚠️ **Consultar jurídico** — risco de autuação; nível de risco: MÉDIO-ALTO

---

### R03 — Ausência de DPIA (Relatório de Impacto à Proteção de Dados)

**Descrição:** A LGPD art. 38 e regulamento ANPD exigem DPIA para tratamentos de alto risco, incluindo: (a) uso de tecnologias inovadoras de rastreamento, (b) tratamento em larga escala, (c) decisões automatizadas com efeitos significativos. O sistema de tracking, fingerprint e atribuição automatizada de comissões pode se enquadrar em pelo menos dois desses critérios.

**Mitigação proposta:**
- Realizar o DPIA antes do go-live, documentando: finalidade, necessidade, proporcionalidade, riscos e mitigações
- O DPIA não precisa ser publicado, mas deve estar disponível para a ANPD em caso de inspeção
- Revisar o DPIA a cada mudança significativa no sistema de tracking
- ⚠️ **Consultar jurídico** — risco regulatório moderado; nível de risco: MÉDIO

---

### R04 — Retenção de Dados de Leads Não Convertidos por Prazo Longo

**Descrição:** Leads que nunca fecharam negócio (status `lost`) e nunca geraram obrigação fiscal são retidos por 2 anos nesta política. A LGPD exige minimização (art. 6º, III): o prazo deve ser o estritamente necessário para a finalidade. Se a finalidade era "qualificar uma venda" e ela não ocorreu, a base legal se esgota muito antes de 2 anos.

**Mitigação proposta:**
- Reduzir para 6 meses o prazo de retenção de PII de leads com status `lost` sem nenhuma atividade
- Implementar notificação ao lead (se email disponível) 30 dias antes da anonimização
- Documentar justificativa de negócio para cada prazo (ex: "ciclo de venda médio no nicho de clínicas é de 90 dias; 180 dias cobre 95% dos casos")
- ⚠️ **Consultar jurídico** sobre o prazo adequado; nível de risco: MÉDIO

---

### R05 — Campo `notes` de Leads como Vetor de PII Não Estruturada e Potencialmente Sensível

**Descrição:** O campo `leads.notes` é texto livre preenchido por atendentes. Na prática, pode conter: condições de saúde ("cliente tem diabetes, mencionou isso"), situação financeira ("não tem cartão de crédito"), dados de terceiros, ou até dados sensíveis (art. 5º, II LGPD — saúde, crenças, etc.). Dados sensíveis têm regime mais restritivo de tratamento (art. 11 LGPD) e requerem consentimento específico ou hipóteses legais mais estritas.

**Mitigação proposta:**
- Criar diretriz explícita no onboarding da empresa: "Não inserir dados de saúde, financeiros detalhados ou de terceiros no campo Notas"
- Implementar aviso na UI ao lado do campo (tooltip: "Insira apenas informações relevantes para o atendimento. Não inclua dados de saúde, financeiros ou de terceiros")
- Fase 2: escanear `notes` com classificador de PII/dados sensíveis antes de persistir (ex: regex para CPF, RG, cartão de crédito; classificador ML para saúde)
- Incluir `notes` no escopo de anonimização (já previsto em §5.4)
- ⚠️ **Consultar jurídico** sobre responsabilidade da plataforma por dados sensíveis inseridos por seus clientes (empresa cliente); nível de risco: ALTO

---

## Apêndice A — Registro de Operações de Tratamento (art. 37 LGPD)

A LGPD art. 37 exige que controladores e operadores mantenham registro das operações de tratamento. Resumo para o MVP:

| Operação | Controlador | Finalidade | Dados | Base Legal |
|----------|-------------|-----------|-------|-----------|
| Cadastro de usuários admin | Indica AÍ! | Prestação do serviço SaaS | Nome, email, telefone | Contrato |
| Cadastro de parceiros | Empresa cliente (controladora) / Indica AÍ! (operadora) | Gestão do programa de indicação | Nome, email, telefone, chave Pix | Contrato |
| Registro de leads | Empresa cliente (controladora) / Indica AÍ! (operadora) | Rastreamento de indicações e vendas | Nome, email, telefone | Contrato + Legítimo interesse |
| Tracking de cliques | Indica AÍ! | Atribuição de comissões e anti-fraude | IP, UA, visitor_id, fingerprint | Contrato + Legítimo interesse |
| Processamento de pagamentos | Indica AÍ! / Asaas (suboperador) | Pagamento de comissões | Chave Pix, CPF | Contrato + Obrigação legal |
| Analytics de uso da plataforma | Indica AÍ! | Melhoria do serviço | Dados agregados de uso | Legítimo interesse |
| Comunicações transacionais | Indica AÍ! | Notificações operacionais | Email, telefone | Contrato |
| Comunicações de marketing | Indica AÍ! / Empresa cliente | Promoção do programa | Email, telefone | Consentimento |

---

## Apêndice B — Checklist de Conformidade LGPD para Go-Live

- [ ] Política de privacidade publicada e acessível em `/privacidade`
- [ ] Termos de uso publicados em `/termos`
- [ ] Canal de contato DPO ativo (`privacidade@indica.ai` + endpoint `/lgpd/contact`)
- [ ] Tabela `consents` implementada com escopos granulares
- [ ] Consent gate no widget JS para analytics_cookies
- [ ] Endpoint `POST /lgpd/requests` funcional para todos os 6 direitos do art. 18
- [ ] ExportDataJob e AnonymizeDataJob testados em staging
- [ ] RetentionSweepJob agendado (diário)
- [ ] `audit_log` com trigger de imutabilidade e permissões de role configuradas
- [ ] `anonymize_user()` function criada e testada
- [ ] DPA assinado com Cloudflare, Vercel, Asaas, Resend
- [ ] DPA de SaaS para clientes (empresa cliente) redigido com jurídico
- [ ] DPIA realizado e documentado
- [ ] Declaração de maioridade no cadastro de parceiros
- [ ] Aviso no campo `notes` do lead na UI
- [ ] Criptografia at-rest confirmada no provider do Postgres (Fly.io/Neon)
- [ ] TLS obrigatório em todos os endpoints (HTTPS-only)
- [ ] Logs de auditoria de acesso admin cross-tenant funcionando

---

*Próxima revisão obrigatória: antes de qualquer mudança que introduza nova finalidade de tratamento ou novo tipo de dado coletado.*

*Versão 1.0 — @security-chief — 2026-05-12*
