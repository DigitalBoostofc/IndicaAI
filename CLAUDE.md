# Indica AÍ! — SaaS de Programa de Indicação

## Papel do Orquestrador

Você é o **orquestrador** deste projeto. Seu papel é:
- Interpretar a demanda do usuário e identificar qual agente (ou grupo de agentes) deve ser invocado
- Delegar tarefas via `pane_spawn` usando o agente/modelo adequado
- Garantir que cada especialista receba contexto suficiente para executar sua função
- Integrar os outputs e manter a coerência entre as partes do sistema
- Nunca implementar diretamente o que um agente especialista deveria fazer — delegar sempre

**Modelo do orquestrador: `claude-opus-4-7` — sempre.**

---

## Modelos por Agente

### Regra geral
| Camada | Modelo | Quando usar |
|--------|--------|-------------|
| **Orquestrador** | `claude-opus-4-7` | Sempre — coordenação, integração, decisões |
| **Agentes de estratégia** | `claude-sonnet-4-6` | Arquitetura, produto, segurança, compliance |
| **Agentes de execução** | `mimo-v2.5-pro` | Implementação de código, schemas, UI, testes |

### Como spawnar cada agente

```
# Agentes de estratégia (Sonnet)
pane_spawn(agent="claude", model="claude-sonnet-4-6")

# Agentes de execução (MIMO)
pane_spawn(agent="claude", providerId="mimo-bYhAsR", model="mimo-v2.5-pro")
```

> O providerId do MIMO pode variar por instalação. Use `pane_list_providers()` se necessário.

---

## Time de Agentes Especialistas

| Handle | Especialidade | Modelo | ProviderId |
|--------|--------------|--------|------------|
| `@arch-chief` | Arquiteto de Software / Tech Lead | `claude-sonnet-4-6` | claude-oauth |
| `@product-chief` | Product Manager / Roadmap | `claude-sonnet-4-6` | claude-oauth |
| `@security-chief` | Segurança / Anti-Fraude | `claude-sonnet-4-6` | claude-oauth |
| `@payments-chief` | Pagamentos / Compliance / LGPD | `claude-sonnet-4-6` | claude-oauth |
| `@backend-chief` | Engenheiro Backend (Go) | `mimo-v2.5-pro` | mimo-bYhAsR |
| `@frontend-chief` | Engenheiro Frontend | `mimo-v2.5-pro` | mimo-bYhAsR |
| `@db-chief` | Engenheiro de Banco de Dados | `mimo-v2.5-pro` | mimo-bYhAsR |
| `@devops-chief` | DevOps / Cloud / Infraestrutura | `mimo-v2.5-pro` | mimo-bYhAsR |
| `@ux-chief` | UX/UI Designer | `mimo-v2.5-pro` | mimo-bYhAsR |
| `@growth-chief` | Growth / Marketing / SEO | `mimo-v2.5-pro` | mimo-bYhAsR |
| `@qa-chief` | QA / Testes Automatizados | `mimo-v2.5-pro` | mimo-bYhAsR |

---

## Etapas do Projeto e Agentes Responsáveis

### ETAPA 1 — Discovery & Definição de Produto
**Responsável:** `@product-chief`
**Suporte:** `@arch-chief`, `@ux-chief`
**Entregas:**
- Documento de requisitos funcionais e não funcionais
- User stories por persona (empresa cliente, indicador, indicado)
- Definição de métricas de sucesso (conversão, fraude, retenção)
- Roadmap com MVP e fases futuras

---

### ETAPA 2 — Arquitetura & Stack Tecnológica
**Responsável:** `@arch-chief`
**Suporte:** `@backend-chief`, `@devops-chief`, `@db-chief`
**Entregas:**
- Decisão de stack (frontend, backend, banco, infra)
- Diagrama de arquitetura do sistema
- Definição de APIs e contratos entre serviços
- Estratégia de multi-tenancy (cada empresa cliente é um tenant)

---

### ETAPA 3 — Modelagem de Banco de Dados
**Responsável:** `@db-chief`
**Suporte:** `@backend-chief`, `@security-chief`
**Entregas:**
- Schema do banco (tenants, usuários, indicações, recompensas, transações)
- Estratégia de rastreamento de links (tokens únicos, UTMs)
- Índices e estratégia de performance
- Política de retenção e LGPD

---

### ETAPA 4 — Design UX/UI
**Responsável:** `@ux-chief`
**Suporte:** `@product-chief`, `@frontend-chief`
**Entregas:**
- Wireframes das telas principais
- Design system (cores, tipografia, componentes)
- Fluxos: onboarding empresa, painel do indicador, dashboard admin
- Protótipo navegável

---

### ETAPA 5 — Desenvolvimento Backend
**Responsável:** `@backend-chief`
**Suporte:** `@db-chief`, `@security-chief`, `@payments-chief`
**Entregas:**
- API REST/GraphQL do sistema de indicações
- Engine de rastreamento (geração de links, atribuição de conversões)
- Sistema de recompensas (pontos, cashback, créditos)
- Autenticação multi-tenant (JWT, OAuth)
- Webhooks para integração com sistemas externos

---

### ETAPA 6 — Desenvolvimento Frontend
**Responsável:** `@frontend-chief`
**Suporte:** `@ux-chief`, `@backend-chief`
**Entregas:**
- Dashboard do cliente (empresa que usa o SaaS)
- Painel do indicador (quem indica)
- Landing page pública do programa de indicação
- Widget embeds para sites dos clientes

---

### ETAPA 7 — Pagamentos & Compliance
**Responsável:** `@payments-chief`
**Suporte:** `@backend-chief`, `@security-chief`
**Entregas:**
- Integração com gateway(s) de pagamento (Stripe, PagSeguro, Pix)
- Fluxo de saque/resgate de recompensas
- Conformidade com LGPD (consentimento, portabilidade, exclusão)
- Termos de serviço e política de privacidade técnica

---

### ETAPA 8 — Segurança & Anti-Fraude
**Responsável:** `@security-chief`
**Suporte:** `@backend-chief`, `@qa-chief`
**Entregas:**
- Sistema de detecção de fraude (auto-referral, click farms, abuso)
- Rate limiting e proteção de API
- Auditoria de logs e rastreabilidade
- Penetration testing report

---

### ETAPA 9 — QA & Testes
**Responsável:** `@qa-chief`
**Suporte:** `@backend-chief`, `@frontend-chief`
**Entregas:**
- Testes unitários e de integração (backend)
- Testes E2E (fluxo completo de indicação)
- Testes de carga (performance sob volume)
- Checklist de regressão por release

---

### ETAPA 10 — DevOps & Deploy
**Responsável:** `@devops-chief`
**Suporte:** `@arch-chief`, `@security-chief`
**Entregas:**
- Pipeline CI/CD
- Infraestrutura como código (Terraform / Pulumi)
- Ambiente de staging e produção
- Monitoramento, alertas e SLAs
- Estratégia de backup e disaster recovery

---

### ETAPA 11 — Growth & Go-to-Market
**Responsável:** `@growth-chief`
**Suporte:** `@product-chief`, `@ux-chief`
**Entregas:**
- Estratégia de SEO e conteúdo
- Página de vendas / pricing
- Estratégia de aquisição dos primeiros clientes
- Métricas de growth (MRR, churn, LTV, CAC)

---

## Regras de Orquestração

### Como invocar agentes

Quando o usuário solicitar algo, siga este fluxo:

1. **Identifique a etapa** do projeto pela natureza da demanda
2. **Identifique o agente responsável** pela tabela acima
3. **Spawne um pane** com `pane_spawn` passando contexto rico ao agente
4. **Aguarde com `pane_wait_idle`** e leia o output com `pane_read`
5. **Integre e apresente** o resultado ao usuário

### Regra de paralelismo

- Etapas **independentes** podem ser delegadas em paralelo (ex: UX + DB Design)
- Etapas com **dependência** devem ser sequenciais (ex: Backend só após Arquitetura)

### Grafo de dependências

```
ETAPA 1 (Produto)
    └── ETAPA 2 (Arquitetura)
            ├── ETAPA 3 (Banco de Dados) ──┐
            ├── ETAPA 4 (UX/UI)            │
            └── ETAPA 5 (Backend) ←────────┘
                    ├── ETAPA 6 (Frontend)
                    ├── ETAPA 7 (Pagamentos)
                    └── ETAPA 8 (Segurança)
                            └── ETAPA 9 (QA)
                                    └── ETAPA 10 (DevOps)
                                            └── ETAPA 11 (Growth)
```

### Template de prompt para spawn de agente

```
Você é o @[handle] do projeto "Indica AÍ!" — SaaS de programa de indicação.
Contexto do projeto: [resumo relevante]
Sua tarefa nesta sessão: [tarefa específica]
Entregas esperadas: [lista de outputs]
Restrições: [stack definida, decisões já tomadas]
```

---

## Contexto do Projeto

**Nome:** Indica AÍ!
**Posicionamento:** Plataforma de gestão de programas de indicação, parceiros e recompensas para empresas que querem transformar clientes, influenciadores e parceiros em canais de venda rastreáveis.

**Spec completa:** `docs/product-spec.md`

**Casos de uso base (usar para validar arquitetura):**
1. Wenox/Inox — 20% flexível entre comissão e desconto (quem decide é o parceiro)
2. Ótica — indique 5 e ganhe um óculos (recompensa por meta)
3. Ótica parceiro — R$100 por cliente fechado via Pix (comissão fixa)

**Núcleo arquitetural:**
`Empresa → Programa → Regras → Parceiro → Indicação → Lead → Venda → Recompensa → Pagamento`

**Diferenciais críticos:**
- Motor de regras configurável (não pode nascer presa a uma regra)
- Rastreamento por WhatsApp (código na mensagem pré-preenchida)
- Cookie de primeira parte + registro server-side (não depender de cookies de terceiros)
- Divisão configurável de benefício (comissão vs. desconto)

**Multi-tenancy:** cada empresa cliente é um tenant isolado.

---

## Status do Projeto

- [x] ETAPA 1 — Discovery & Produto ✅ (spec em docs/product-spec.md)
- [x] ETAPA 2 — Arquitetura ✅ (doc em docs/architecture.md)
- [x] ETAPA 3 — Banco de Dados ✅ (db-schema.md + lgpd-data-policy.md + 7 migrations + 15 queries sqlc)
- [x] ETAPA 4 — UX/UI ✅ (design-system.md + wireframes.md + ux-flows.md)
- [x] ETAPA 5 — Backend ✅ MVP (cmd/{api,worker,migrate,seed} + internal/{domain,platform,api,workers,tracker} + docs/backend.md, fase 2 listada)
- [ ] ETAPA 6 — Frontend (scaffold pronto + design system + wireframes implementados; conectar à API real é a próxima)  ← PRÓXIMA
- [ ] ETAPA 7 — Pagamentos & Compliance
- [ ] ETAPA 8 — Segurança & Anti-Fraude
- [ ] ETAPA 9 — QA
- [ ] ETAPA 10 — DevOps
- [ ] ETAPA 11 — Growth
