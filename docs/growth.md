# Indica AÍ! — Growth & Go-to-Market (ETAPA 11)

> Estratégia de aquisição, pricing e métricas para os primeiros 100 clientes.

## Resumo executivo

- **ICP MVP:** pequenas e médias empresas brasileiras (5–50 funcionários, faturamento R$ 200k–5M/mês) que já têm um produto/serviço validado e dependem de boca-a-boca informal ou afiliados ad-hoc — vendas via WhatsApp são um sinal forte.
- **GTM motion:** product-led self-serve com trial de 14 dias, sales-assisted apenas no tier Scale. Founder-led sales para os 30 primeiros clientes.
- **Pricing:** 4 tiers em BRL (Trial → Starter R$97 → Growth R$297 → Scale R$697+). Sem cobrança transacional no MVP — simplifica venda e onboarding.
- **Aquisição inicial (0→10 clientes):** LinkedIn outreach + comunidades + parcerias com agências de marketing digital. SEO entra a partir do 11º cliente.
- **North Star Metric:** ARR. Métricas de suporte: ativação (% criando primeiro programa em <7 dias), CAC payback (<12 meses), NRR (>100%).
- **Decisão crítica:** NÃO entrar em marketplaces/enterprise no MVP — eles têm programa interno ou exigem integração via ERP. Foco em SMB onde a dor é maior e a venda é mais rápida.

---

## 1. ICP — Ideal Customer Profile

### 1.1 Quem é (priorizado)

| Critério | Valor |
|----------|-------|
| Tamanho | 5–50 funcionários, faturamento R$ 200k–5M/mês |
| Segmento | Varejo físico, ecommerce SMB, serviços profissionais, B2B SMB |
| Vendas dominante | WhatsApp/Instagram ou loja física (presencial), não checkout self-service puro |
| Sinal de fit | Já paga comissão a indicadores em planilha, ou usa cupom de desconto não-rastreado |
| Decisor | Dono/sócio operacional (sem departamento de marketing dedicado) |
| Geografia | Brasil — SP/RJ/MG/PR/SC primeiro (densidade comercial + bancarização Pix madura) |

### 1.2 Quem NÃO é (anti-ICP)

- **Marketplaces** (Amazon, Mercado Livre, iFood) — já têm programa interno
- **Grandes redes** (>500 funcionários) — exigem integração ERP/SAP, ciclo de venda 6+ meses
- **Negócios sem produto recorrente OU recorrente baixo** — LTV pequeno demais pra ROI de indicação compensar
- **Empresas sem fluxo digital** (cobrança/contato 100% offline) — não conseguem rastrear sequer o link

### 1.3 Três personas-âncora (dos casos de uso da spec)

1. **Wenox/Inox** — fabricante B2B vendendo para arquitetos/marceneiros. Quer dar 20% flexível (parceiro escolhe entre comissão Pix ou desconto pro cliente). Ciclo: 2-4 semanas.
2. **Ótica de bairro** — varejo físico. "Indique 5, ganhe óculos." Recompensa não-monetária. Ciclo: 1-2 semanas.
3. **Ótica parceiro programa de revenda** — paga R$ 100 por cliente fechado via Pix, comissão fixa. Ciclo: 1 semana.

Esses 3 podem virar **case studies** assinados nos primeiros 6 meses.

---

## 2. Pricing

### 2.1 Tiers

| Tier | Preço/mês | Programas | Parceiros | Limite mensal $ comissões | Suporte | Quem cabe |
|------|-----------|-----------|-----------|---------------------------|---------|-----------|
| **Trial** | R$ 0 (14 dias) | 1 | até 5 | R$ 500 | docs + community | onboarding inicial |
| **Starter** | R$ 97 | 1 | até 20 | R$ 2.000 | email 24h | varejo pequeno, prestador serviço |
| **Growth** | R$ 297 | 3 | até 100 | R$ 10.000 | chat + email 4h | maioria dos clientes; sweet spot |
| **Scale** | R$ 697+ (custom) | ilimitado | ilimitado | ilimitado | Slack dedicado + SLA | B2B com volume, redes pequenas |

**Anual:** 10% off (R$ 87/R$ 267/R$ 627). Pago à vista por boleto/Pix ou cartão.

### 2.2 Por que não cobrar transacional (% de comissão processada)

Por mais que % seja a forma "perfeita" de alinhar incentivo (clientes pagam mais quando faturam mais), no MVP isso adiciona:
- Fricção na decisão de compra (cliente precisa modelar % esperado)
- Complexidade contábil (faturamento variável, NF complicada)
- Conversa difícil quando há cobrança de comissão E o cliente já vai pagar comissão ao parceiro

Decisão: flat-rate no MVP. Reavaliar em 6 meses quando tivermos baseline de comissões médias por tier.

### 2.3 Política de overage

Se o cliente Starter processar mais de R$ 2.000 em comissões num mês, NÃO cobramos overage. Em vez disso:
- Notificamos no painel + email
- Sugerimos upgrade pra Growth
- Não bloqueamos features

A meta é maximizar NRR via upgrade voluntário, não fricção. Hard cap só no Scale (já é ilimitado).

### 2.4 Refund + Cancelamento

- Trial: sem cartão, sem refund (nunca foi cobrado)
- Mensal: cancela quando quiser, acesso até fim do ciclo
- Anual: pro-rated refund se cancelar nos primeiros 60 dias; depois disso, acesso até vencimento

### 2.5 Free tier?

**Não.** Free permanente diluiria atenção do time e atrai usuários que não viram pagantes. Trial 14 dias é suficiente.

---

## 3. GTM Motion

### 3.1 Funil

```
Visitante → Trial signup → Programa criado → 1º partner ativo → 1º indicação real → Convertido em pago
```

Métrica-chave por etapa:
- Visitor → Trial: 3% conversion (SaaS B2B SMB médio)
- Trial → Pago: 25% (alta porque trial sem cartão exige momentum)
- Trial → Programa criado em 7d: 60% (gating de ativação)
- Pago → Retido após 90 dias: 80%

### 3.2 Motion por tier

| Tier | Motion | Ferramenta |
|------|--------|-----------|
| Starter | 100% self-serve | onboarding in-app + docs |
| Growth | self-serve com nudge humano se ficar parado 5d | email automation + 1 call opcional |
| Scale | sales-led | demo + proposta + onboarding white-glove |

### 3.3 Onboarding em <10 minutos

Sequência obrigatória pós-signup:
1. Criar empresa + programa (3 min) — wizard guiado
2. Configurar regra (2 min) — templates dos 3 casos de uso
3. Convidar primeiro partner (2 min) — link compartilhável
4. Receber primeiro clique de teste (2 min) — botão "simular clique" no painel
5. Marcar como "pronto pra produção"

Sem essa sequência completada em 7 dias = trial em risco. Trigger automatizado: email + dica in-app.

---

## 4. Aquisição: 0 → 100 clientes

### 4.1 Estágio 0–10 (mês 0–2): founder-led

- **LinkedIn outreach 1:1** — fundador conecta com 100 donos de SMB/semana, mensagem personalizada. Meta: 5 reuniões/semana → 1 conversão/semana.
- **Comunidades**: posts ativos no LinkedIn, Sebrae online, Endeavor, fóruns de e-commerce (Olist, Nuvemshop, Loja Integrada). Não vender direto — agregar valor.
- **Parcerias 1:1 com agências**: 5–10 agências de marketing digital BR. Comissão de 30% recorrente por cliente trazido. Margens apertam mas é volume nos primeiros meses.
- **Waitlist com early-bird discount** (40% off lifetime nos 50 primeiros) — captura interesse antes do produto ficar polido.

CAC nessa fase: ~R$ 0 monetário, ~10h fundador/cliente. Aceitável.

### 4.2 Estágio 11–50 (mês 3–6): SEO + content

- **SEO orientado a intent**: keywords "programa de indicação para empresa", "marketing de afiliados brasil", "sistema de comissão pra vendedor externo", "como pagar indicador via Pix"
- **Blog com 2 posts/semana** — pillar pages sobre cada caso de uso
- **Lead magnet**: PDF "Guia de Programa de Indicação para Pequenas Empresas" (gated com email)
- **Calculadora de ROI** interativa em `/calculadora` — input: ticket médio, volume mensal, % comissão; output: receita extra esperada
- **YouTube/TikTok** — 1 vídeo curto/semana mostrando setup real de um programa em 5 min

Meta de SEO: ranking top-3 em 5 keywords long-tail em 6 meses.

CAC estimado nessa fase: R$ 50–150/cliente (conteúdo + tempo).

### 4.3 Estágio 51–100 (mês 7–12): paid acquisition

Só ligamos paid quando temos:
- LTV/CAC > 3 medido com dados reais
- Onboarding sem fricção (trial-to-paid > 20%)
- 3 case studies bem documentados

Canais:
- Google Ads em intent keywords (volume baixo, alta conversão)
- LinkedIn Ads pra ICP B2B
- Meta Ads é último recurso (ICP de varejo está lá mas qualifica mal)

Budget inicial: R$ 3k/mês, escalando com CAC payback < 12 meses.

---

## 5. SEO e Conteúdo

### 5.1 Estrutura de URL

- `/` — landing principal
- `/precos` — pricing dedicado (criado nesta ETAPA)
- `/como-funciona` — explicação do produto
- `/casos-de-uso/[varejo|servicos|b2b]` — landing por vertical
- `/blog/[slug]` — conteúdo
- `/calculadora-roi` — ferramenta interativa
- `/guia-programa-indicacao` — pillar SEO

### 5.2 Top-10 keywords (target)

| # | Keyword | Volume BR/mês | Dificuldade | Intent |
|---|---------|---------------|-------------|--------|
| 1 | programa de indicação | ~2.4k | médio | navegacional |
| 2 | marketing de indicação | ~1.9k | médio | informacional |
| 3 | sistema de comissão para vendedor | ~880 | baixo | transacional |
| 4 | como criar programa de indicação | ~720 | baixo | informacional |
| 5 | pagar indicador via pix | ~480 | baixo | transacional |
| 6 | software de afiliados brasil | ~390 | médio | transacional |
| 7 | indique e ganhe sistema | ~320 | baixo | transacional |
| 8 | programa de cashback empresa | ~210 | médio | transacional |
| 9 | rastrear indicação cliente | ~170 | baixo | transacional |
| 10 | comissão para parceiros saas | ~140 | baixo | transacional |

### 5.3 Technical SEO

- Server-side rendering (Next.js já entrega)
- robots.txt + sitemap.xml gerados dinamicamente
- OpenGraph + Twitter Cards em todas páginas
- Schema.org structured data (Organization, Product, FAQPage)
- Core Web Vitals: LCP <2.5s, INP <200ms, CLS <0.1 — Vercel + Cloudflare CDN entregam por default
- Hreflang: por enquanto só pt-BR; futuro pt-PT + es-LA

---

## 6. Métricas

### 6.1 North Star

**ARR** (Annual Recurring Revenue) — quantifica saúde financeira sem ser vaidade.

### 6.2 Métricas de aquisição

| Métrica | Definição | Meta MVP (6 meses) |
|---------|-----------|---------------------|
| Visitors → Trial | % de visitantes únicos que ativam trial | 3% |
| Trial → Paid | % que vira pago em 30d | 25% |
| Time-to-value | Mediana de tempo trial → primeiro lead real | <5 dias |
| CAC | Custo total aquisição / clientes pagos novos | <R$ 250 |
| Payback Period | Meses pra CAC se pagar via MRR | <12 meses |

### 6.3 Métricas de retenção

| Métrica | Definição | Meta |
|---------|-----------|------|
| GRR (Gross Retention) | (MRR início − churn) / MRR início | >90% |
| NRR (Net Retention) | inclui expansion (upgrades) | >105% |
| Logo Churn | clientes que cancelaram / clientes início | <5%/mês |
| Activation rate | % de novos clientes que criam 1º programa em 7d | >70% |
| 30d retention | % ainda pagando após 30d | >80% |

### 6.4 Métricas operacionais (saúde do produto)

- **Commission velocity**: R$ comissão processada/mês por cliente (proxy de engajamento)
- **Partners per program**: distribuição (mediana > 5 indica adoção real)
- **Fraud rate**: % de referrals com `attribution_score < 0.5` (engine de fraude da ETAPA 8)
- **Time to first payout**: mediana de tempo cliente → primeiro Pix pago a partner

### 6.5 Onde ficam os dashboards

Grafana Cloud (free tier escolhido na ETAPA 10) com 3 dashboards:
1. **Growth** — ARR, MRR, novos signups, conversões
2. **Activation** — funil onboarding, time-to-value, % completando steps
3. **Retention** — cohorts mensais, churn por tier, expansion MRR

---

## 7. Roadmap de Execução — Tickets GROWTH-XX

### 🔴 P0 — Pré-launch (executar antes dos primeiros 10 clientes)

| # | Ticket | Estimativa |
|---|--------|-----------|
| GROWTH-01 | Página `/precos` dedicada com 4 tiers (esta etapa) | 2h |
| GROWTH-02 | OpenGraph + structured data em `web/apps/public/app/layout.tsx` | 1h |
| GROWTH-03 | `robots.txt` + `sitemap.ts` dinâmico no `public` app | 1h |
| GROWTH-04 | Página `/como-funciona` com os 3 casos de uso visuais | 4h |
| GROWTH-05 | Landing page de waitlist com captura de email + sequência de boas-vindas | 6h |
| GROWTH-06 | LinkedIn outbound playbook (script + planilha de tracking) | 4h (não-código) |

### 🟡 P1 — Primeiro mês pós-launch

| # | Ticket | Estimativa |
|---|--------|-----------|
| GROWTH-07 | Calculadora de ROI interativa em `/calculadora` | 8h |
| GROWTH-08 | Setup analytics: Plausible/PostHog + eventos customizados | 4h |
| GROWTH-09 | Email automation: welcome series + activation nudges (Resend templates) | 8h |
| GROWTH-10 | Lead magnet PDF "Guia de Programa de Indicação" | 6h (não-código) |
| GROWTH-11 | 5 posts blog pillar (1500 palavras cada) | 25h (não-código) |
| GROWTH-12 | Dashboard interno de growth metrics no Grafana | 4h |

### 🟢 P2 — Quando virar produto-market fit

| # | Ticket | Estimativa |
|---|--------|-----------|
| GROWTH-13 | Página por vertical: `/casos-de-uso/varejo`, `/servicos`, `/b2b` | 12h |
| GROWTH-14 | Programa de afiliados próprio (dog-fooding!) | 12h |
| GROWTH-15 | Schema.org FAQ + integração com Google Search Console | 4h |
| GROWTH-16 | A/B testing infra (Vercel + edge config) | 8h |
| GROWTH-17 | Loja de integrações (Shopify, Nuvemshop, RD Station) — começa com 1 | 40h |

---

## 8. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Cliente espera integração com ERP/Shopify/RD desde dia 1 | Alta | Médio | Posicionar como "padrão para empresas que querem começar simples"; lista pública de integrações no roadmap |
| Cliente que vendeu programa antes (planilha) tem hábito ruim | Alta | Baixo | Onboarding empático: importação CSV de partners existentes; manter UX simples |
| Concorrência de player grande (RD Station, ActiveCampaign) | Média | Alto | Foco em UX BR + Pix nativo + WhatsApp first — pontos onde players globais são fracos |
| LGPD multa | Baixa | Alto | ETAPAs 7/8 já cobriram; manter consentimento explícito; runbook DPO |
| Fraude organizada (rings) | Média | Alto | Engine ETAPA 8; revisar regras trimestralmente; suspeita = manual review humano antes de payout |

---

## 9. Próximos passos imediatos (esta ETAPA)

Artefatos entregues nesta sessão:
1. `docs/growth.md` (este doc) — estratégia consolidada
2. `web/apps/public/app/precos/page.tsx` — página de pricing dedicada (GROWTH-01)
3. Metadata + OpenGraph em `web/apps/public/app/layout.tsx` (GROWTH-02)
4. `web/apps/public/public/robots.txt` + `web/apps/public/app/sitemap.ts` (GROWTH-03)

Tudo o resto fica como tickets GROWTH-XX numerados para o time priorizar conforme tração.
