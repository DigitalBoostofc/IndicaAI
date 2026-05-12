# Indica AÍ! — Especificação de Produto (v1.0)

> Plataforma de gestão de programas de indicação, parceiros e recompensas para empresas que querem transformar clientes, influenciadores e parceiros em canais de venda rastreáveis.

---

## Conceito Central

### 3 Camadas da Plataforma

| Camada | Quem usa | O que faz |
|--------|----------|-----------|
| **Área da Empresa/Cliente** | Empresa que contrata o SaaS | Cria e gerencia programas de indicação |
| **Área do Indicador/Parceiro/Afiliado** | Pessoa que indica | Pega link, acompanha indicações, vê comissões e pagamentos |
| **Área Admin da Plataforma** | Dono do SaaS | Gerencia empresas, planos, usuários, suporte, taxas globais |

### Fluxo Principal

```
Empresa cria programa
    → Parceiro recebe link/código
    → Indica pessoas
    → Sistema registra origem
    → Empresa atualiza status do lead
    → Sistema calcula recompensa
    → Parceiro acompanha
    → Empresa paga
```

---

## Motor de Regras Configurável

**Esta é a alma do sistema.** A plataforma não pode nascer presa a uma regra específica.

### Tipos de Recompensa

- Valor fixo por venda
- Percentual sobre venda
- Desconto para o indicado
- Comissão para o parceiro
- Divisão configurável entre desconto e comissão
- Recompensa por meta (ex: indique 5, ganhe um brinde)
- Brinde físico
- Pontos
- Cashback
- Comissão recorrente

### Condições de Validação

- Lead cadastrado
- Venda realizada
- Pagamento confirmado
- Cliente permaneceu X dias
- Meta atingida
- Aprovação manual

### Prazo de Atribuição

- 7, 15, 30, 60, 90 dias
- Personalizado

### Formas de Pagamento

- Pix
- Crédito interno
- Cupom
- Brinde
- Desconto
- Manual

---

## Casos de Uso Reais (Base para Arquitetura)

### Caso 1 — Wenox/Inox: Comissão/Desconto Flexível

**Regra:** Parceiro tem 20% de benefício e decide se usa como comissão, desconto para o cliente ou divide meio a meio.

| Campo | Valor |
|-------|-------|
| Tipo | Comissão/desconto flexível |
| Benefício total | 20% |
| Quem decide a divisão | Parceiro |
| Opções | 20/0, 10/10, 0/20, divisão personalizada até 20% |

### Caso 2 — Ótica: Recompensa por Meta

**Regra:** Quem indicar 5 pessoas que fecharem, ganha um óculos.

| Campo | Valor |
|-------|-------|
| Tipo | Recompensa por meta |
| Meta | 5 indicações aprovadas |
| Recompensa | Óculos/brinde |
| Validação | Somente conta se a pessoa indicada comprar |

### Caso 3 — Ótica: Comissão Fixa por Parceiro

**Regra:** A cada cliente indicado que fechar, o parceiro recebe R$100 no Pix.

| Campo | Valor |
|-------|-------|
| Tipo | Comissão fixa por venda |
| Valor | R$100 |
| Condição | Cliente indicado fechou compra |
| Pagamento | Pix |

---

## Sistema de Links de Indicação

### Estrutura do Link

```
seudominio.com/r/karine
seudominio.com/r/8XK92A
```

### O que acontece no clique

1. Registra o clique
2. Identifica quem é o parceiro
3. Salva cookie de primeira parte (não depender de cookies de terceiros)
4. Registra server-side (IP, dispositivo aproximado, timestamp)
5. Redireciona para: site, landing page, WhatsApp, checkout ou formulário

### UTMs para Análise

```
seudominio.com/r/karine?utm_source=parceiros&utm_medium=indicacao&utm_campaign=otica_100_pix
```

> UTM = análise de tráfego. Código interno do parceiro = cálculo de comissão. Os dois coexistem mas têm funções separadas.

---

## Rastreamento via WhatsApp

### Fluxo

1. Pessoa clica no link da Karine
2. Sistema registra clique
3. Abre WhatsApp da empresa com mensagem pré-preenchida
4. Mensagem: `Olá, vim pela indicação da Karine. Código: KARINE-8XK92A`
5. Atendente cadastra/valida o lead no painel
6. Se fechar → comissão vai para Karine

### Por que funciona

- Simples e funcional para o MVP
- Não requer integração técnica no site da empresa
- Atendimento manual + rastreamento automático do código

---

## Rastreamento via Site/Landing Page/Checkout

### Mecanismos em camadas

| Mecanismo | Função |
|-----------|--------|
| Campo oculto `referral_code` no formulário | Captura no submit |
| Cookie de primeira parte | Lembrar indicação mesmo sem submit imediato |
| Registro server-side | Histórico de clique permanente |
| Parâmetro `?ref=karine` na URL | Propagação entre páginas |
| Integração com CRM/WhatsApp | Validar fechamento manual |

**Prazo de atribuição:** se a pessoa clicar hoje e comprar em 30 dias, o parceiro ainda recebe.

---

## Status das Indicações

```
Novo Lead → Em Atendimento → Qualificado → Fechou / Não Fechou
                                               ↓
                                     Comissão Pendente
                                               ↓
                                     Comissão Aprovada
                                               ↓
                                     Disponível para Pagamento
                                               ↓
                                          Pago / Cancelado
```

---

## Funcionalidades do MVP

### Área da Empresa

- [ ] Cadastro da empresa
- [ ] Cadastro de programa (motor de regras)
- [ ] Cadastro de parceiros
- [ ] Geração de links únicos por parceiro
- [ ] Definição do destino do link (WhatsApp, site, landing, checkout)
- [ ] Lista de leads/indicações
- [ ] Controle de status dos leads
- [ ] Aprovação/reprovação de indicações
- [ ] Controle de comissões
- [ ] Marcar comissões como pagas

### Área do Parceiro

- [ ] Login
- [ ] Link exclusivo + botão copiar
- [ ] Cadastro manual de indicação
- [ ] Acompanhamento de status das indicações
- [ ] Extrato de comissões (pendente / aprovada / paga)
- [ ] Histórico de pagamentos
- [ ] Cadastro de chave Pix

### Tracking Engine

- [ ] Link único por parceiro por programa
- [ ] Registro de clique (timestamp, IP, dispositivo)
- [ ] Redirecionamento para WhatsApp/site com código
- [ ] Cookie de primeira parte
- [ ] Registro server-side do histórico de origem
- [ ] Prazo de atribuição configurável

### Área Admin (SaaS Owner)

- [ ] Gestão de empresas clientes
- [ ] Gestão de planos e billing
- [ ] Suporte e configurações globais
- [ ] Métricas da plataforma (MRR, churn, uso)

---

## Nichos-Alvo

Óticas · Clínicas · Academias · Agências · Provedores de internet · Lojas · Infoprodutores · Escolas · Estéticas · Imobiliárias · Prestadores de serviço

---

## LGPD

- Informar claramente a finalidade do uso dos dados
- Coletar apenas dados necessários (mínimo necessário)
- Política de privacidade obrigatória
- Permitir exclusão/ajuste de dados
- Controle de acesso por perfil
- Logs de auditoria de alterações

---

## Arquitetura Conceitual do Núcleo

```
Empresas criam Programas
Programas têm Regras
Parceiros participam de Programas
Parceiros geram Indicações
Indicações viram Leads
Leads podem virar Vendas
Vendas geram Recompensas
Recompensas viram Pagamentos
```
