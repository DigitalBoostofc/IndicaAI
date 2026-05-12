# Indica AÍ! — Wireframes (v1.0)

> Documento produzido por @ux-chief | 2026-05-12
> Dependências: `design-system.md` (componentes, tokens), `product-spec.md`, `ux-flows.md` (fluxos F1-F8)
> Stack: shadcn/ui (Sidebar, Tabs, Sheet, Table, Dialog, Card, Badge, Toast)
> Notação: `[botão]`, `(input)`, `{toggle}`, `<ícone>`, ═══ borda, ─── separador

---

## Índice

- [1. Área da Empresa](#1-área-da-empresa-dashboardindicaai)
  - [1.1 Onboarding (3 steps)](#11-onboarding)
  - [1.2 Dashboard Overview](#12-dashboard-overview)
  - [1.3 Lista de Programas + Wizard](#13-lista-de-programas--wizard-de-criação)
  - [1.4 Lista de Parceiros + Cadastro](#14-lista-de-parceiros)
  - [1.5 Lista de Leads/Indicações](#15-lista-de-indicaçõesleads)
  - [1.6 Comissões](#16-comissões)
  - [1.7 Configurações](#17-configurações)
- [2. Área do Parceiro](#2-área-do-parceiro-appindicaaiparceiro)
  - [2.1 Login Magic Link](#21-login-magic-link)
  - [2.2 Painel do Parceiro](#22-painel-do-parceiro)
  - [2.3 Cadastro Manual de Indicação](#23-cadastro-manual-de-indicação)
  - [2.4 Lista de Indicações com Timeline](#24-lista-de-indicações)
  - [2.5 Extrato + Saque Pix](#25-extrato--saque-pix)
  - [2.6 Configurações Pessoais + LGPD](#26-configurações-pessoais--lgpd)
- [3. Área Admin](#3-área-admin-adminindicaai)
  - [3.1 Gestão de Empresas](#31-gestão-de-empresas)
  - [3.2 Planos e Billing](#32-planos-e-billing)
  - [3.3 Suporte](#33-suporte)
  - [3.4 Métricas da Plataforma](#34-métricas-da-plataforma)
  - [3.5 Configurações Globais](#35-configurações-globais)
- [4. Público (Landing Pages)](#4-público-indicaai)
  - [4.1 Landing Page do SaaS](#41-landing-page-do-saas)
  - [4.2 Landing de Programa por Tenant](#42-landing-de-programa-por-tenant)
  - [4.3 LGPD — Cookies e Direitos](#43-lgpd--banner-de-cookies-e-direitos)

---

## 1. Área da Empresa (`dashboard.indica.ai`)

### Layout Base (Dashboard)

Todas as telas da empresa usam o mesmo layout shell:

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ■ Indica AÍ!     [🔍 Buscar...]         [🔔] [Avatar ▾]   │ ← Header
├────────┬─────────────────────────────────────────────────────────────────┤
│        │                                                                 │
│ <ico>  │  Título da Página                          [Ação principal]    │
│ Visão  │                                                                 │
│ geral  │  ┌───────────────────────────────────────────────────────────┐  │
│        │  │                                                           │  │
│ <ico>  │  │              CONTEÚDO PRINCIPAL                           │  │
│ Progra │  │              (tabela, cards, formulário)                  │  │
│ mas    │  │                                                           │  │
│        │  │                                                           │  │
│ <ico>  │  └───────────────────────────────────────────────────────────┘  │
│ Parcei │                                                                 │
│ ros    │                                                                 │
│        │                                                                 │
│ <ico>  │                                                                 │
│ Indica │                                                                 │
│ ções   │                                                                 │
│        │                                                                 │
│ <ico>  │                                                                 │
│ Comiss │                                                                 │
│ões     │                                                                 │
│        │                                                                 │
│ ────── │                                                                 │
│ <ico>  │                                                                 │
│ Config │                                                                 │
│        │                                                                 │
│ ────── │                                                                 │
│        │                                                                 │
│ [Nome  │                                                                 │
│ Tenant │                                                                 │
│  ▾]    │                                                                 │
└────────┴─────────────────────────────────────────────────────────────────┘
```

**Componentes:** shadcn Sidebar (collapsible), Avatar, DropdownMenu, Input de busca, Badge de notificações.

**Tenant Switcher:** no rodapé da sidebar — dropdown com lista de tenants que o usuário pertence (para usuários multi-tenant). Seleciona → muda `app.current_tenant` → recarrega dados.

**Mobile:** Sidebar vira drawer (Sheet lateral), header fixo com hamburger + tenant switcher.

---

### 1.1 Onboarding

#### Step 1 — Cadastro da Empresa

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│                  ■ Indica AÍ!                            │
│                                                          │
│   ┌──────────────────────────────────────────────────┐   │
│   │                                                  │   │
│   │         Crie sua conta gratuita                  │   │
│   │                                                  │   │
│   │   ┌──────────────────────────────────────────┐   │   │
│   │   │  [  Entrar com Google  ]                 │   │   │
│   │   └──────────────────────────────────────────┘   │   │
│   │                                                  │   │
│   │   ─────── ou continue com e-mail ───────         │   │
│   │                                                  │   │
│   │   Nome completo                                  │   │
│   │   (___________________________________)          │   │
│   │                                                  │   │
│   │   E-mail                                         │   │
│   │   (___________________________________)          │   │
│   │                                                  │   │
│   │   Senha (mín. 8 caracteres)                      │   │
│   │   (___________________________________) 👁        │   │
│   │                                                  │   │
│   │   ☑ Li e aceito os Termos de Uso e a             │   │
│   │     Política de Privacidade                      │   │
│   │                                                  │   │
│   │   [ Criar conta ]                                │   │
│   │                                                  │   │
│   │   Já tem conta? Entrar                           │   │
│   │                                                  │   │
│   └──────────────────────────────────────────────────┘   │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Componentes:** Card centralizado (`max-w-md`), Button Google OAuth, Input, Checkbox, Link.
**Mobile:** Full-width com padding de 16px.

#### Step 2 — Verificação de E-mail

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│                  ■ Indica AÍ!                            │
│                                                          │
│   ┌──────────────────────────────────────────────────┐   │
│   │                                                  │   │
│   │              ✉️                                   │   │
│   │                                                  │   │
│   │     Verifique seu e-mail                          │   │
│   │                                                  │   │
│   │   Enviamos um link para:                          │   │
│   │   k***@gmail.com                                 │   │
│   │                                                  │   │
│   │   Clique no link para ativar sua conta.          │   │
│   │                                                  │   │
│   │   Não recebeu?                                   │   │
│   │   [ Reenviar e-mail ] (disponível em 60s)        │   │
│   │                                                  │   │
│   └──────────────────────────────────────────────────┘   │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

#### Step 3 — Criar Empresa + Primeiro Programa

Após verificação, o wizard de 3 sub-steps:

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│  Passo 1 de 3 — Sua empresa            ● ○ ○            │
│  ──────────────────────────────────────────────           │
│                                                          │
│  Nome da empresa                                         │
│  (_______________________________________)               │
│                                                          │
│  CNPJ (opcional no MVP)                                  │
│  (___.___.___/____-__)                                   │
│                                                          │
│  Nicho de atuação                                        │
│  [ Selecione... ▾ ]     (Ótica, Clínica, Loja, Outro)   │
│                                                          │
│  Subdomínio desejado                                     │
│  (________).indica.ai     → live preview                 │
│                                                          │
│                                        [ Próximo → ]     │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Sub-step 2:** wizard de criação do programa (ver §1.3).
**Sub-step 3:** convite de parceiros (ver §1.4).

Após concluir, redireciona para Dashboard (§1.2) com guias contextuais.

---

### 1.2 Dashboard Overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ■ Indica AÍ!     [🔍 Buscar...]                         [🔔] [Avatar ▾]│
├────────┬─────────────────────────────────────────────────────────────────┤
│        │                                                                 │
│ <ico>  │  Visão geral                                                7d ▾│
│ VISÃO  │                                                                 │
│ GERAL  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│        │  │ Cliques  │ │ Indic.   │ │ Comissão │ │ Parceiros│           │
│ <ico>  │  │ últimos  │ │ novas    │ │ a pagar  │ │ ativos   │           │
│ Progra │  │ 7 dias   │ │ 7 dias   │ │          │ │          │           │
│ mas    │  │          │ │          │ │          │ │          │           │
│        │  │  1.234   │ │    23    │ │ R$2.400  │ │    12    │           │
│ <ico>  │  │ ↑12%     │ │ ↑8%      │ │ ↓3%      │ │ →0%      │           │
│ Parcei │  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
│ ros    │                                                                 │
│        │  ┌─────────────────────────────┐ ┌────────────────────────────┐ │
│ <ico>  │  │ Cliques por dia             │ │ Top parceiros              │ │
│ Indica │  │ (gráfico de barras 7d)      │ │                            │ │
│ ções   │  │                             │ │ 1. Karine    15 ind.  R$15k│ │
│        │  │  ▓▓▓                        │ │ 2. Pedro      8 ind.  R$8k │ │
│ <ico>  │  │ ▓▓▓▓▓    ▓▓                │ │ 3. Ana        5 ind.  R$5k │ │
│ Comiss │  │ ▓▓▓▓▓▓▓▓▓▓▓▓               │ │ 4. João       3 ind.  R$3k │ │
│ões     │  │                             │ │                            │ │
│        │  └─────────────────────────────┘ └────────────────────────────┘ │
│ ────── │                                                                 │
│ <ico>  │  ┌──────────────────────────────────────────────────────────┐   │
│ Config │  │ Indicações recentes                                      │   │
│        │  │──────────────────────────────────────────────────────────│   │
│        │  │ Nome         Parceiro    Status         Data             │   │
│        │  │ Maria Silva  Karine      ● Fechado      12/05            │   │
│        │  │ José Souza   Pedro       ○ Em atendim.  11/05            │   │
│        │  │ Ana Costa    Karine      ● Novo         11/05            │   │
│        │  │                                                  [Ver tudo]│   │
│        │  └──────────────────────────────────────────────────────────┘   │
│        │                                                                 │
└────────┴─────────────────────────────────────────────────────────────────┘
```

**Componentes:** StatCard (4x), Recharts BarChart, Table com 5 rows recentes, Badge de status.
**Dados:** API calls para `/api/dashboard/stats`, `/api/leads?limit=5&sort=-created_at`.
**Mobile:** Stats em grid 2x2, gráfico full-width, tabela vira lista de cards.

**Guias contextuais (primeira visita):**
- Banner no topo: "Bem-vindo! Comece compartilhando seu link de indicação." [Copiar link]
- Tooltip no StatCard de parceiros: "Seus parceiros aparecem aqui quando se cadastram pelo link de convite."

---

### 1.3 Lista de Programas + Wizard de Criação

#### Lista

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ■ Indica AÍ!     [🔍 Buscar...]                         [🔔] [Avatar ▾]│
├────────┬─────────────────────────────────────────────────────────────────┤
│        │                                                                 │
│ <ico>  │  Programas                                      [ + Novo prog ]│
│ Visão  │                                                                 │
│ geral  │  ┌──────────────────────────────────────────────────────────┐   │
│        │  │                                                          │   │
│ ★      │  │  Programa de Indicação Wenox                            │   │
│ Progra │  │  ● Ativo  │  3 parceiros  │  145 cliques  │  R$2.400    │   │
│ mas    │  │  Regra: Split 20% comissão/desconto                      │   │
│        │  │  Link: indica.ai/r/wenox-...    [Copiar] [Editar] [···]  │   │
│ <ico>  │  │                                                          │   │
│ Parcei │  │  ─────────────────────────────────────────────────────── │   │
│ ros    │  │                                                          │   │
│        │  │  Ótica Premium — Indique e Ganhe                        │   │
│ <ico>  │  │  ● Ativo  │  8 parceiros  │  312 cliques  │  R$800      │   │
│ Indica │  │  Regra: R$100 por venda confirmada (Pix)                │   │
│ ções   │  │  Link: indica.ai/r/otica-pre...  [Copiar] [Editar] [···]│   │
│        │  │                                                          │   │
│ <ico>  │  └──────────────────────────────────────────────────────────┘   │
│ Comiss │                                                                 │
│ões     │                                                                 │
│ ────── │                                                                 │
│ <ico>  │                                                                 │
│ Config │                                                                 │
└────────┴─────────────────────────────────────────────────────────────────┘
```

**Componentes:** Card por programa, Badge de status, CopyLinkButton, DropdownMenu com ações (editar, pausar, arquivar).

#### Wizard de Criação (Sheet lateral ou página dedicada)

O wizard abre como uma **página dedicada** (`/dashboard/programas/novo`) com stepper no topo:

```
┌──────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│  Novo Programa                                           [Salvar rascunho]│
│                                                                          │
│  ● Nome  ○ Regra  ○ Destino  ○ Revisão                                  │
│  ─────────────────────────────────────                                   │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐    │
│  │                                                                  │    │
│  │  Nome do programa                                                │    │
│  │  (______________________________________________)                │    │
│  │                                                                  │    │
│  │  Descrição (opcional)                                            │    │
│  │  (______________________________________________)                │    │
│  │  (______________________________________________)                │    │
│  │                                                                  │    │
│  │                                          [ Próximo: Regra → ]    │    │
│  │                                                                  │    │
│  └──────────────────────────────────────────────────────────────────┘    │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

**Step 2 — Regra (Motor de Regras em linguagem natural):**

```
┌──────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│  Novo Programa                                           [Salvar rascunho]│
│                                                                          │
│  ✓ Nome  ● Regra  ○ Destino  ○ Revisão                                  │
│  ─────────────────────────────────────                                   │
│                                                                          │
│  Como o parceiro recebe?                                                 │
│                                                                          │
│  ┌────────────────────────────────┐  ┌───────────────────────────────┐   │
│  │ 💰 Comissão por venda          │  │ 🎯 Recompensa por meta        │   │
│  │ O parceiro recebe R$ ou %     │  │ Ao atingir N vendas, ganha    │   │
│  │ a cada venda confirmada.      │  │ um brinde ou crédito.         │   │
│  └────────────────────────────────┘  └───────────────────────────────┘   │
│  ┌────────────────────────────────┐                                      │
│  │ 🔀 Comissão + desconto flexível│                                      │
│  │ O parceiro escolhe: guardar    │                                      │
│  │ como comissão ou dar desconto. │                                      │
│  └────────────────────────────────┘                                      │
│                                                                          │
│  ── Se "Comissão por venda" selecionado: ──                              │
│                                                                          │
│  Qual o valor da comissão?                                               │
│  ○ R$ (_______) fixo por venda                                           │
│  ○ (____)% sobre o valor da venda                                        │
│                                                                          │
│  Quando pagar?                                                           │
│  [ Quando o lead fechar a venda ▾ ]                                      │
│                                                                          │
│  Como pagar?                                                             │
│  [ Pix automático ▾ ]                                                    │
│                                                                          │
│  Valor mínimo para saque: R$ (50,00)                                     │
│                                                                          │
│  ─────────────────────────────────────                                   │
│  📋 Preview da regra:                                                    │
│  ┌──────────────────────────────────────────────────────────────────┐    │
│  │ Toda vez que um indicado fechar uma venda, o parceiro recebe     │    │
│  │ R$100,00 no Pix, após aprovação. Saque mínimo: R$50,00.         │    │
│  │                                                  [ Editar regra ]│    │
│  └──────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  [ ← Voltar ]                                          [ Próximo: Destino → ]│
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

**Componentes:** Cards clicáveis para seleção de tipo, RadioGroup, Input numérico com máscara, Select, RewardRulePreview (card ao vivo).

**Step 3 — Destino do link:**

```
  Para onde o parceiro indica?
  ┌────────────────────────────────┐
  │ 📱 WhatsApp da empresa         │
  │ Número: (__) _____-____        │
  │                                │
  │ Prévia da mensagem:            │
  │ "Olá, vim pela indicação de    │
  │ {nome}. Código: {código}"      │
  └────────────────────────────────┘
  ┌────────────────────────────────┐
  │ 🌐 Site da empresa             │
  │ URL: https://(...)             │
  └────────────────────────────────┘
  ┌────────────────────────────────┐
  │ 📄 Landing page do programa    │
  │ Gerada automaticamente         │
  └────────────────────────────────┘

  Janela de atribuição:
  [ 30 dias ▾ ]  (7, 15, 30, 60, 90)
```

**Step 4 — Revisão:**

```
  Revise seu programa:
  ┌──────────────────────────────────────────────────────────┐
  │  Nome: Programa de Indicação Wenox                       │
  │  Regra: R$100 por venda confirmada, via Pix              │
  │  Destino: WhatsApp (11) 99999-0000                       │
  │  Atribuição: 30 dias                                     │
  │                                                          │
  │  [ Editar qualquer etapa ]                               │
  └──────────────────────────────────────────────────────────┘

  [ Publicar programa ]
```

Após publicar: Toast de sucesso + redirect para a lista com o novo programa visível.

---

### 1.4 Lista de Parceiros

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ■ Indica AÍ!     [🔍 Buscar...]                         [🔔] [Avatar ▾]│
├────────┬─────────────────────────────────────────────────────────────────┤
│        │                                                                 │
│ <ico>  │  Parceiros           Programa: [Todos ▾]    [ + Convidar ]      │
│ ...    │                                                                 │
│        │  ┌──────────────────────────────────────────────────────────┐   │
│ <ico>  │  │ 🔍 Buscar parceiro...                                  🔍│   │
│ Parcei │  │──────────────────────────────────────────────────────────│   │
│ ros    │  │ Nome        Programa  Indic.  Cliques  Comissão  Status  │   │
│        │  │──────────────────────────────────────────────────────────│   │
│ ★      │  │ Karine S.   Wenox      15     1.200    R$1.500  ● Ativo │   │
│ Progra │  │ Pedro L.    Wenox       8       430      R$800  ● Ativo │   │
│ mas    │  │ Ana C.      Ótica       5       210      R$500  ● Ativo │   │
│        │  │ João M.     Ótica       0         0        R$0  ○ Pend. │   │
│ <ico>  │  │                                                          │   │
│ Indica │  │  Mostrando 1-4 de 12              [< Anterior] [Próximo >]│   │
│ ções   │  └──────────────────────────────────────────────────────────┘   │
│        │                                                                 │
│ <ico>  │                                                                 │
│ Comiss │                                                                 │
│ões     │                                                                 │
└────────┴─────────────────────────────────────────────────────────────────┘
```

**Ao clicar em um parceiro → Sheet lateral:**

```
┌─────────────────────────────────────────────────────────────┐
│  Parceiro: Karine Silva                          [✕]        │
│─────────────────────────────────────────────────────────────│
│                                                             │
│  📱 (11) 99999-0000  │  ✉️ karine@email.com                │
│  Programa: Wenox  │  Status: ● Ativo                       │
│                                                             │
│  ── Link de indicação ──                                    │
│  ┌──────────────────────────────────────────────┐           │
│  │ 🔗 indica.ai/r/karine-8xk92a    [ Copiar ]   │           │
│  └──────────────────────────────────────────────┘           │
│                                                             │
│  ── Métricas ──                                             │
│  Indicações: 15  │  Cliques: 1.200  │  Comissão: R$1.500   │
│                                                             │
│  ── Indicações recentes ──                                  │
│  Maria Silva    ● Fechado    R$100   12/05                  │
│  José Souza     ○ Em atend.    —     11/05                  │
│                                                             │
│  [ Ver todas as indicações ]                                │
│                                                             │
│  ───                                                       │
│  [ Suspender ]  [ Excluir ]                                 │
└─────────────────────────────────────────────────────────────┘
```

#### Modal de Convite

```
┌──────────────────────────────────────────────────────┐
│  Convidar parceiros                                  │
│──────────────────────────────────────────────────────│
│                                                      │
│  Programa: [Programa de Indicação Wenox ▾]           │
│                                                      │
│  ── Convidar individualmente ──                      │
│  Nome         (________________________)             │
│  WhatsApp     (__) _____-____                        │
│  E-mail       (________________________)             │
│                              [ + Adicionar outro ]   │
│                                                      │
│  ── Ou importar lista ──                             │
│  [ Selecionar arquivo CSV ]  Modelo: baixar .csv     │
│                                                      │
│  ── Ou compartilhar link ──                          │
│  ┌──────────────────────────────────────────────┐    │
│  │ 🔗 indica.ai/convite/wenox-abc123 [Copiar]   │    │
│  └──────────────────────────────────────────────┘    │
│                                                      │
│           [ Cancelar ]  [ Enviar convites ]          │
└──────────────────────────────────────────────────────┘
```

---

### 1.5 Lista de Indicações/Leads

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ■ Indica AÍ!     [🔍 Buscar...]                         [🔔] [Avatar ▾]│
├────────┬─────────────────────────────────────────────────────────────────┤
│        │                                                                 │
│ <ico>  │  Indicações                                                     │
│ ...    │                                                                 │
│        │  Programa: [Todos ▾]  Status: [Todos ▾]  Período: [7 dias ▾]   │
│ <ico>  │                                                                 │
│ Indica │  ┌──────────────────────────────────────────────────────────┐   │
│ ções   │  │ 🔍 Buscar por nome, telefone ou parceiro...            🔍│   │
│        │  │──────────────────────────────────────────────────────────│   │
│        │  │ Nome         Telefone     Parceiro  Status       Data    │   │
│ ★      │  │──────────────────────────────────────────────────────────│   │
│ Progra │  │ Maria S.     11999...     Karine    ● Fechado    12/05   │   │
│ mas    │  │ José S.      11988...     Pedro     ○ Em atend.  11/05   │   │
│        │  │ Ana C.       11977...     Karine    ◐ Novo       11/05   │   │
│ <ico>  │  │ Carlos R.    11966...     Ana       ◐ Novo       10/05   │   │
│ Parcei │  │ Lucia F.     11955...     Pedro     ✕ Não fechou 09/05   │   │
│ ros    │  │                                                          │   │
│        │  │ Mostrando 1-5 de 23             [< Anterior] [Próximo >]  │   │
│ <ico>  │  └──────────────────────────────────────────────────────────┘   │
│ Comiss │                                                                 │
│ões     │  [ Aprovar selecionados ]  [ Exportar CSV ]                     │
│ ────── │                                                                 │
│ <ico>  │                                                                 │
│ Config │                                                                 │
└────────┴─────────────────────────────────────────────────────────────────┘
```

**Ao clicar em uma indicação → Sheet lateral com timeline:**

```
┌─────────────────────────────────────────────────────────────┐
│  Indicação: Maria Silva                          [✕]        │
│─────────────────────────────────────────────────────────────│
│                                                             │
│  Status: ● Fechado  │  Parceiro: Karine                     │
│  Telefone: (11) 99999-0000  │  Origem: WhatsApp             │
│                                                             │
│  ── Timeline ──                                             │
│  ◉ 12/05 14:30  Venda confirmada — R$1.000,00              │
│  │                Comissão: R$100,00 (aprovada)             │
│  ◉ 10/05 09:15  Em atendimento                             │
│  │                Atendente: Dra. Patricia                  │
│  ◉ 09/05 16:42  Novo lead cadastrado                       │
│  │                Via link WhatsApp de Karine               │
│  ◉ 09/05 16:40  Clique registrado                          │
│                  IP: 189.x.x.x  │  Dispositivo: iPhone     │
│                                                             │
│  ── Ações ──                                                │
│  Status: [ Fechado ▾ ]  → alterar status                    │
│                                                             │
│  Notas:                                                     │
│  (Cliente queria lente progressiva. Fechamos com 10% desc.) │
│                                                             │
│  [ Salvar ]                                                  │
└─────────────────────────────────────────────────────────────┘
```

**Componentes:** Table com filtros, Badge de status, Sheet com timeline (lista vertical com ícones), Select para mudança de status, Textarea para notas.
**Mobile:** Tabela vira lista de cards com as mesmas informações.

---

### 1.6 Comissões

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ■ Indica AÍ!     [🔍 Buscar...]                         [🔔] [Avatar ▾]│
├────────┬─────────────────────────────────────────────────────────────────┤
│        │                                                                 │
│ <ico>  │  Comissões                                                      │
│ ...    │                                                                 │
│        │  Status: [Todos ▾]  Período: [30 dias ▾]  Programa: [Todos ▾]  │
│ <ico>  │                                                                 │
│ Comiss │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                          │
│ões    │  │Penden│ │Aprova│ │Pagas │ │Cancel│                           │
│        │  │ te   │ │ da   │ │      │ │ adas │                           │
│ ★      │  │R$2.4k│ │R$1.1k│ │R$5.2k│ │ R$200│                           │
│ Progra │  └──────┘ └──────┘ └──────┘ └──────┘                          │
│ mas    │                                                                 │
│        │  ┌──────────────────────────────────────────────────────────┐   │
│ <ico>  │  │ Parceiro     Indicação     Valor      Status    Ação    │   │
│ Parcei │  │──────────────────────────────────────────────────────────│   │
│ ros    │  │ Karine       Maria S.     R$100,00   Pendente  ☑ Apr.  │   │
│        │  │ Pedro        José S.      R$150,00   Pendente  ☑ Apr.  │   │
│ <ico>  │  │ Karine       Ana C.       R$100,00   Aprovada    —      │   │
│ Indica │  │ Ana          Carlos R.    R$80,00    Paga        —      │   │
│ ções   │  │                                                          │   │
│        │  │ [ Aprovar selecionados ]  [ Rejeitar selecionados ]       │   │
│ <ico>  │  │                                                          │   │
│ Config │  │  Mostrando 1-8 de 34           [< Anterior] [Próximo >]  │   │
│ ────── │  └──────────────────────────────────────────────────────────┘   │
│        │                                                                 │
└────────┴─────────────────────────────────────────────────────────────────┘
```

**Ações em lote:** checkbox por row + botões "Aprovar selecionados" / "Rejeitar selecionados" no topo ou footer.
**Aprovação individual:** botão de check por row → Dialog de confirmação "Aprovar comissão de R$100,00 para Karine?".

---

### 1.7 Configurações

Página com abas (Tabs):

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ■ Indica AÍ!     [🔍 Buscar...]                         [🔔] [Avatar ▾]│
├────────┬─────────────────────────────────────────────────────────────────┤
│        │                                                                 │
│ <ico>  │  Configurações                                                  │
│ ...    │                                                                 │
│        │  [ Perfil ] [ Empresa ] [ WhatsApp ] [ Webhooks ] [ Equipe ] [ Billing ]│
│ <ico>  │  ─────────────────────────────────────────────────────────────  │
│ Config │                                                                 │
│        │  Perfil                                                         │
│        │  ─────────────────────────────────────────────────────────────  │
│        │                                                                 │
│        │  Nome          (Leonardo Groff)                                 │
│        │  E-mail        (leonardo@email.com)  [ Alterar ]                │
│        │  Telefone      (11) 99999-0000       [ Alterar ]                │
│        │  Senha         ••••••••              [ Alterar senha ]          │
│        │  2FA           ○ Desativado  {toggle}                          │
│        │                                                                 │
│        │  [ Salvar alterações ]                                          │
│        │                                                                 │
│        │  ── Zona de perigo ──                                          │
│        │  [ Excluir minha conta ]  (ação irreversível, pede confirmação)│
│        │                                                                 │
└────────┴─────────────────────────────────────────────────────────────────┘
```

**Aba WhatsApp:** configuração do número, prévia da mensagem, modo (manual/automático).
**Aba Webhooks:** lista de endpoints, teste de envio, secret key.
**Aba Equipe:** lista de membros, convite por e-mail, remoção.
**Aba Billing:** plano atual, uso, upgrade, histórico de faturas.

---

## 2. Área do Parceiro (`app.indica.ai/parceiro`)

### Layout Base

```
┌────────────────────────────────────┐
│ ■ Indica AÍ!          [Avatar ▾]   │ ← Header compacto
├────────────────────────────────────┤
│                                    │
│         CONTEÚDO                   │ ← Full-width, sem sidebar
│                                    │
├────────────────────────────────────┤
│  🏠    📋    💰    ⚙️               │ ← Bottom tab bar (mobile)
│  Painel Indic. Extr. Config        │
└────────────────────────────────────┘
```

**Mobile-first:** Bottom tab bar em mobile, sidebar em desktop. Layout single-column.

---

### 2.1 Login Magic Link

```
┌──────────────────────────────────────┐
│                                      │
│          ■ Indica AÍ!               │
│                                      │
│    ┌──────────────────────────────┐  │
│    │                              │  │
│    │   Acesse seu painel          │  │
│    │                              │  │
│    │   E-mail                     │  │
│    │   (______________________)   │  │
│    │                              │  │
│    │   [ Enviar link de acesso ]  │  │
│    │                              │  │
│    │   Enviaremos um link        │  │
│    │   mágico para seu e-mail.    │  │
│    │   Sem senha necessária.      │  │
│    │                              │  │
│    └──────────────────────────────┘  │
│                                      │
└──────────────────────────────────────┘
```

Após clicar no link do e-mail: redirect automático para o Painel (§2.2) com sessão ativa.

---

### 2.2 Painel do Parceiro

```
┌────────────────────────────────────────────────────────────┐
│ ■ Indica AÍ!  │  Olá, Karine!                   [Avatar ▾]│
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Seu link de indicação                                     │
│  ┌──────────────────────────────────────────────────┐      │
│  │ 🔗 indica.ai/r/karine-8xk92a          [ Copiar ] │      │
│  │                                                  │      │
│  │  [ Compartilhar via WhatsApp ]                   │      │
│  └──────────────────────────────────────────────────┘      │
│                                                            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                    │
│  │ Saldo    │ │ Indic.   │ │ Próximo  │                    │
│  │ disponível│ │ ativas   │ │ pagamento│                    │
│  │          │ │          │ │          │                    │
│  │ R$450,00 │ │    8     │ │  20/05   │                    │
│  └──────────┘ └──────────┘ └──────────┘                    │
│                                                            │
│  Últimas indicações                                        │
│  ┌──────────────────────────────────────────────────┐      │
│  │ Maria Silva    ● Fechado    R$100,00   12/05     │      │
│  │ José Souza     ○ Em atend.    —        11/05     │      │
│  │                                                  │      │
│  │                                      [ Ver todas ]│      │
│  └──────────────────────────────────────────────────┘      │
│                                                            │
│  ┌──────────────────────────────────────────────────┐      │
│  │  [ + Cadastrar indicação manual ]                │      │
│  └──────────────────────────────────────────────────┘      │
│                                                            │
├────────────────────────────────────────────────────────────┤
│  🏠       📋       💰       ⚙️                              │
│  Painel  Indic.   Extrato  Config                         │
└────────────────────────────────────────────────────────────┘
```

**Componentes:** CopyLinkButton, StatCard (3x), Table com últimas indicações, Button para indicação manual.
**Compartilhar WhatsApp:** usa Web Share API ou `wa.me/?text=...` com mensagem pré-preenchida.
**Mobile:** Grid de stats em coluna única, bottom tab bar fixo.

---

### 2.3 Cadastro Manual de Indicação

```
┌────────────────────────────────────────────────────────────┐
│ ■ Indica AÍ!  │  Nova indicação                 [← Voltar ]│
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Quem você está indicando?                                 │
│                                                            │
│  Nome da pessoa                                            │
│  (____________________________________)                    │
│                                                            │
│  WhatsApp (com DDD)                                        │
│  (__) _____-____                                           │
│                                                            │
│  E-mail (opcional)                                         │
│  (____________________________________)                    │
│                                                            │
│  ── Se o programa for split flexível ──                    │
│  Como você quer usar o benefício?                          │
│  ○ Tudo como comissão (20%)                                │
│  ○ Meio a meio (10% comissão + 10% desconto)              │
│  ○ Tudo como desconto para o cliente (20%)                 │
│  ○ Personalizar                                            │
│                                                            │
│  Notas (opcional)                                          │
│  (____________________________________)                    │
│  (____________________________________)                    │
│                                                            │
│  [ Cadastrar indicação ]                                   │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

**Mobile:** Full-screen form, bottom-fixed button.

---

### 2.4 Lista de Indicações

```
┌────────────────────────────────────────────────────────────┐
│ ■ Indica AÍ!  │  Minhas indicações                         │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Filtros:  Status: [Todos ▾]  Período: [30 dias ▾]        │
│                                                            │
│  ┌──────────────────────────────────────────────────┐      │
│  │ Maria Silva                                      │      │
│  │ Status: ● Fechado  │  Valor: R$1.000            │      │
│  │ Comissão: R$100,00 (aprovada)                    │      │
│  │ Cadastrada: 09/05                                │      │
│  │                                                  │      │
│  │ ▸ Ver timeline                                   │      │
│  └──────────────────────────────────────────────────┘      │
│  ┌──────────────────────────────────────────────────┐      │
│  │ José Souza                                       │      │
│  │ Status: ○ Em atendimento                         │      │
│  │ Cadastrado: 11/05                                │      │
│  │                                                  │      │
│  │ ▸ Ver timeline                                   │      │
│  └──────────────────────────────────────────────────┘      │
│                                                            │
│  [ Carregar mais ]                                         │
│                                                            │
├────────────────────────────────────────────────────────────┤
│  🏠       📋       💰       ⚙️                              │
│  Painel  Indic.   Extrato  Config                         │
└────────────────────────────────────────────────────────────┘
```

**Timeline expansível (ao clicar "Ver timeline"):**

```
  ┌──────────────────────────────────────────────────┐
  │ ◉ 12/05 14:30  Venda confirmada                 │
  │ │               R$1.000,00 → comissão R$100,00   │
  │ ◉ 10/05 09:15  Em atendimento                   │
  │ │               Atendente: Dra. Patricia         │
  │ ◉ 09/05 16:42  Indicação cadastrada             │
  │                 Por: você (manual)               │
  └──────────────────────────────────────────────────┘
```

---

### 2.5 Extrato + Saque Pix

```
┌────────────────────────────────────────────────────────────┐
│ ■ Indica AÍ!  │  Extrato                                    │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌──────────────────────────────────────────────────┐      │
│  │  Saldo disponível:          R$ 450,00            │      │
│  │  Pendente de aprovação:     R$ 200,00            │      │
│  │  Total já pago:           R$ 1.350,00            │      │
│  └──────────────────────────────────────────────────┘      │
│                                                            │
│  [ Solicitar saque Pix ]                                   │
│                                                            │
│  ── Chave Pix cadastrada ──                                │
│  CPF: ***.***.***-**   [ Alterar ]                         │
│                                                            │
│  ── Histórico ──                                           │
│  ┌──────────────────────────────────────────────────┐      │
│  │ 12/05  Saque Pix      R$ 350,00   ● Processando │      │
│  │ 05/05  Saque Pix      R$ 500,00   ● Pago        │      │
│  │ 28/04  Comissão       R$ 100,00   (Maria S.)    │      │
│  │ 25/04  Comissão       R$ 250,00   (Pedro L.)    │      │
│  │ 20/04  Saque Pix      R$ 200,00   ● Pago        │      │
│  └──────────────────────────────────────────────────┘      │
│                                                            │
├────────────────────────────────────────────────────────────┤
│  🏠       📋       💰       ⚙️                              │
│  Painel  Indic.   Extrato  Config                         │
└────────────────────────────────────────────────────────────┘
```

**Dialog de saque:**

```
┌──────────────────────────────────────────────┐
│  Solicitar saque via Pix                     │
│──────────────────────────────────────────────│
│                                              │
│  Valor disponível: R$ 450,00                 │
│                                              │
│  Quanto deseja sacar?                        │
│  R$ (____________)                           │
│  [ Sacar tudo ]  ← preenche R$ 450,00       │
│                                              │
│  Chave Pix: ***.***.***-** (CPF)            │
│  [ Alterar chave ]                           │
│                                              │
│  O pagamento será processado em até          │
│  2 dias úteis.                               │
│                                              │
│      [ Cancelar ]  [ Confirmar saque ]       │
└──────────────────────────────────────────────┘
```

---

### 2.6 Configurações Pessoais + LGPD

```
┌────────────────────────────────────────────────────────────┐
│ ■ Indica AÍ!  │  Configurações                              │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Dados pessoais                                            │
│  ─────────────────────────────────────────                  │
│  Nome      (Karine Silva)                                  │
│  E-mail    (karine@email.com)                              │
│  Telefone  (11) 99999-0000                                 │
│  Chave Pix (CPF: ***.***.***-**)  [ Alterar ]              │
│                                                            │
│  [ Salvar ]                                                │
│                                                            │
│  ─────────────────────────────────────────                  │
│  Seus direitos (LGPD)                                      │
│  ─────────────────────────────────────────                  │
│  Você tem direito sobre seus dados pessoais.               │
│                                                            │
│  [ Solicitar cópia dos meus dados ]                         │
│  [ Corrigir meus dados ]                                    │
│  [ Solicitar exclusão da minha conta ]                      │
│                                                            │
│  Suas solicitações são processadas em até 15 dias.         │
│  Dúvidas? privacidade@indica.ai                            │
│                                                            │
│  ─────────────────────────────────────────                  │
│  Notificações                                              │
│  ─────────────────────────────────────────                  │
│  E-mail sobre novas indicações    {toggle} ✓               │
│  E-mail sobre pagamentos          {toggle} ✓               │
│  WhatsApp sobre novas indicações  {toggle}                 │
│                                                            │
├────────────────────────────────────────────────────────────┤
│  🏠       📋       💰       ⚙️                              │
│  Painel  Indic.   Extrato  Config                         │
└────────────────────────────────────────────────────────────┘
```

**Dialogs LGPD:** cada botão abre Dialog com confirmação e explicação do processo (ver ux-flows.md Fluxo 7).

---

## 3. Área Admin (`admin.indica.ai`)

### Layout Base

Mesmo shell do dashboard da empresa, mas com sidebar diferente (sem tenant switcher — admin vê todos os tenants).

---

### 3.1 Gestão de Empresas

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ■ Indica AÍ! Admin     [🔍 Buscar...]                    [Avatar ▾]     │
├────────┬─────────────────────────────────────────────────────────────────┤
│        │                                                                 │
│ <ico>  │  Empresas                                                       │
│ Métri- │                                                                 │
│ cas    │  Status: [Todos ▾]  Plano: [Todos ▾]   [ + Nova empresa ]      │
│        │                                                                 │
│ <ico>  │  ┌──────────────────────────────────────────────────────────┐   │
│ Empres │  │ Empresa       Subdomínio     Plano   Parceiros  Status   │   │
│ as     │  │──────────────────────────────────────────────────────────│   │
│        │  │ Wenox         wenox          Pro     12         ● Ativo  │   │
│ <ico>  │  │ Ótica Premium otica-prem.    Starter  8         ● Ativo  │   │
│ Planos │  │ Clínica Vida  clinica-vida   Free      1         ○ Pend. │   │
│        │  │                                                          │   │
│ <ico>  │  │ Mostrando 1-3 de 15              [< Anterior] [Próximo >]│   │
│ Suport │  └──────────────────────────────────────────────────────────┘   │
│ e      │                                                                 │
│        │                                                                 │
│ <ico>  │                                                                 │
│ Config │                                                                 │
└────────┴─────────────────────────────────────────────────────────────────┘
```

**Ao clicar em uma empresa → Sheet:**

```
┌─────────────────────────────────────────────────────────────┐
│  Empresa: Wenox                                     [✕]     │
│─────────────────────────────────────────────────────────────│
│                                                             │
│  CNPJ: 12.345.678/0001-99  │  Plano: Pro                   │
│  Subdomínio: wenox.indica.ai  │  Status: ● Ativo            │
│                                                             │
│  ── Métricas ──                                             │
│  Programas: 2  │  Parceiros: 12  │  Leads: 145              │
│  Comissões pagas: R$5.200  │  MRR: R$97,00                 │
│                                                             │
│  ── Ações ──                                                │
│  [ Suspender empresa ]                                      │
│  [ Acessar como admin (impersonate) ]  ← log auditado       │
│  [ Ver detalhes de billing ]                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### 3.2 Planos e Billing

```
  Planos
  ──────────────────────────────────────────────────────────

  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
  │    Free      │ │   Starter    │ │     Pro      │
  │              │ │              │ │              │
  │  R$ 0/mês    │ │  R$ 97/mês   │ │  R$ 297/mês  │
  │              │ │              │ │              │
  │  1 programa  │ │  5 programas │ │  Ilimitado   │
  │  3 parceiros │ │  50 parceiros│ │  Ilimitado   │
  │  Suporte     │ │  Suporte     │ │  Suporte     │
  │  e-mail      │ │  chat        │ │  prioritário │
  │              │ │              │ │              │
  │  15 empresas │ │  8 empresas  │ │  2 empresas  │
  └──────────────┘ └──────────────┘ └──────────────┘

  ── Faturas recentes ──
  Data         Empresa    Plano    Valor     Status
  01/05/2026   Wenox      Pro      R$297,00  ● Pago
  01/05/2026   Ótica Pr.  Starter  R$97,00   ● Pago
```

---

### 3.3 Suporte

```
  Suporte
  ──────────────────────────────────────────────────────────

  Filtro:  Status: [Aberto ▾]  Empresa: [Todas ▾]

  ┌──────────────────────────────────────────────────────────┐
  │ #001  Wenox        "Não consigo adicionar parceiro"     │
  │       Aberto há 2h  │  Prioridade: Alta                 │
  │       [ Responder ] [ Impersonate Wenox ]               │
  │──────────────────────────────────────────────────────────│
  │ #002  Ótica Prem.  "Como altero a regra?"               │
  │       Aberto há 1d  │  Prioridade: Normal               │
  │       [ Responder ]                                      │
  └──────────────────────────────────────────────────────────┘

  ── Aviso sobre impersonate ──
  Toda ação de impersonate é registrada no audit_log
  com seu user_id, timestamp e IP.
```

---

### 3.4 Métricas da Plataforma

```
  Métricas
  ──────────────────────────────────────────────────────────

  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
  │ MRR      │ │ Empresas │ │ Churn    │ │ Novos    │
  │          │ │ ativas   │ │ mensal   │ │ (30d)    │
  │ R$1.200  │ │   15     │ │   5%     │ │    3     │
  └──────────┘ └──────────┘ └──────────┘ └──────────┘

  ┌─────────────────────────────┐ ┌─────────────────────────┐
  │ MRR ao longo do tempo       │ │ Distribuição de planos  │
  │ (gráfico de linha)          │ │ (gráfico de pizza)      │
  │                             │ │                         │
  │         ╱╲                  │ │   Free: 60%             │
  │     ╱╲╱  ╲╱╲               │ │   Starter: 27%          │
  │ ──╱         ╲──             │ │   Pro: 13%              │
  │                             │ │                         │
  └─────────────────────────────┘ └─────────────────────────┘

  ── Uso da plataforma ──
  Total de leads: 1.234
  Total de parceiros: 89
  Comissões pagas (30d): R$12.400
```

---

### 3.5 Configurações Globais

```
  Configurações
  ──────────────────────────────────────────────────────────

  [ Geral ] [ Limites ] [ E-mail ] [ LGPD ]

  ── Geral ──
  Nome da plataforma    (Indica AÍ!)
  URL de suporte        (https://indica.ai/suporte)
  E-mail de contato     (suporte@indica.ai)

  ── Limites padrão por plano ──
  Free:      1 programa, 3 parceiros, 100 leads/mês
  Starter:   5 programas, 50 parceiros, 2.000 leads/mês
  Pro:       ilimitado

  [ Salvar ]
```

---

## 4. Público (`indica.ai`)

### 4.1 Landing Page do SaaS

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│  ■ Indica AÍ!    Funcionalidades   Preços   Contato   [ Entrar ]│
│                                                                  │
│  ──────────────────────────────────────────────────────────────  │
│                                                                  │
│  Transforme seus clientes                                      │
│  em canais de venda.                                           │
│                                                                  │
│  Crie programas de indicação, acompanhe resultados              │
│  e pague comissões — tudo automático.                          │
│                                                                  │
│  [ Começar grátis ]  [ Ver como funciona ]                      │
│                                                                  │
│  ──────────────────────────────────────────────────────────────  │
│                                                                  │
│  Como funciona                                                  │
│                                                                  │
│  1. Crie seu programa     2. Convide parceiros     3. Venda mais│
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────┐│
│  │ Configure regras  │    │ Parceiros recebem│    │ Acompanhe    ││
│  │ de comissão em    │    │ links exclusivos │    │ indicações,  ││
│  │ minutos.          │    │ e compartilham.  │    │ pague e cres-││
│  │                   │    │                  │    │ ça.          ││
│  └──────────────────┘    └──────────────────┘    └──────────────┘│
│                                                                  │
│  ──────────────────────────────────────────────────────────────  │
│                                                                  │
│  Para quem é                                                    │
│  Óticas · Clínicas · Academias · Lojas · Imobiliárias           │
│  Escolas · Estéticas · Infoprodutores · Agências                │
│                                                                  │
│  ──────────────────────────────────────────────────────────────  │
│                                                                  │
│  Preços                                                         │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐             │
│  │    Free      │ │   Starter    │ │     Pro      │             │
│  │  R$ 0/mês    │ │  R$ 97/mês   │ │  R$ 297/mês  │             │
│  │              │ │              │ │              │             │
│  │  1 programa  │ │  5 programas │ │  Ilimitado   │             │
│  │  3 parceiros │ │  50 parceiros│ │  Ilimitado   │             │
│  │              │ │              │ │              │             │
│  │ [ Começar ]  │ │ [ Assinar ]  │ │ [ Fale connos│             │
│  └──────────────┘ └──────────────┘ └──────────────┘             │
│                                                                  │
│  ──────────────────────────────────────────────────────────────  │
│  Footer: Termos · Privacidade · LGPD · privacidade@indica.ai    │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Componentes:** Hero section, 3-step grid, pricing cards, CTA buttons. SSR/ISR para SEO.

---

### 4.2 Landing de Programa por Tenant

URL: `indica.ai/p/[slug-do-programa]`

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │                                                  │    │
│  │  [Logo da empresa]                               │    │
│  │                                                  │    │
│  │  Programa de Indicação                           │    │
│  │  Wenox                                           │    │
│  │                                                  │    │
│  │  Indique amigos e ganhe benefícios!              │    │
│  │                                                  │    │
│  │  ── Como funciona ──                             │    │
│  │  1. Compartilhe seu link exclusivo               │    │
│  │  2. Seu amigo realiza uma compra                 │    │
│  │  3. Você recebe sua comissão no Pix              │    │
│  │                                                  │    │
│  │  [ Quero participar ]                            │    │
│  │                                                  │    │
│  │  ── Se já é parceiro ──                          │    │
│  │  [ Acessar meu painel ]                          │    │
│  │                                                  │    │
│  └──────────────────────────────────────────────────┘    │
│                                                          │
│  ──────────────────────────────────────────────────────  │
│  Powered by Indica AÍ! · Termos · Privacidade            │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Componentes:** Card centralizado, logo do tenant (`settings.logo_url`), CTA para cadastro, link para login de parceiro existente. SSR com dados do programa.

---

### 4.3 LGPD — Banner de Cookies e Direitos

#### Banner de Cookies (overlay inferior)

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│  🍪 Este site usa cookies                                        │
│                                                                  │
│  Usamos cookies essenciais para o funcionamento do site e        │
│  cookies de análise para melhorar sua experiência.               │
│                                                                  │
│  ☐ Cookies de análise (opcionais)                                │
│                                                                  │
│  [ Aceitar essenciais ]  [ Aceitar todos ]  [ Saiba mais ]       │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Comportamento:**
- Checkbox de analytics **não pré-marcado** (LGPD: consentimento explícito)
- "Aceitar essenciais" → ativa apenas cookies operacionais (atribuição de indicação)
- "Aceitar todos" → ativa analytics + operacional
- "Saiba mais" → link para `/privacidade`
- Banner persiste até interação do usuário
- Preferência salva em `localStorage` + registrada em `consents`

#### Página `/lgpd/contact`

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│  ■ Indica AÍ!                                            │
│                                                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │                                                  │    │
│  │  Seus dados pessoais                             │    │
│  │                                                  │    │
│  │  De acordo com a LGPD (Lei 13.709/2018),        │    │
│  │  você tem direito a:                             │    │
│  │                                                  │    │
│  │  • Acessar seus dados                            │    │
│  │  • Corrigir dados incorretos                     │    │
│  │  • Solicitar a exclusão                          │    │
│  │  • Exportar seus dados                           │    │
│  │  • Revogar consentimentos                        │    │
│  │                                                  │    │
│  │  Para exercer seus direitos:                     │    │
│  │                                                  │    │
│  │  E-mail: (________________________)              │    │
│  │  Tipo de solicitação: [ Selecione ▾ ]           │    │
│  │  Descrição:                                     │    │
│  │  (____________________________________)         │    │
│  │  (____________________________________)         │    │
│  │                                                  │    │
│  │  [ Enviar solicitação ]                          │    │
│  │                                                  │    │
│  │  ──────────────────────────────────────────────  │    │
│  │  Encarregado de Proteção de Dados (DPO):         │    │
│  │  privacidade@indica.ai                           │    │
│  │                                                  │    │
│  └──────────────────────────────────────────────────┘    │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## 5. Resumo de Tratamento Mobile

| Tela | Mobile | Desktop |
|------|--------|---------|
| **Dashboard empresa** | Stats 2x2, gráfico full-width, tabela → cards | Grid 4 colunas, side-by-side |
| **Sidebar empresa** | Drawer (Sheet) | Fixa, collapsible |
| **Lista parceiros/leads** | Cards empilhados | Tabela |
| **Sheet de detalhe** | Full-screen | 480px lateral |
| **Dialog** | Full-screen em mobile | Centralizado |
| **Painel parceiro** | Bottom tab bar, single column | Sidebar + conteúdo |
| **Extrato parceiro** | Cards de resumo empilhados | Grid lado a lado |
| **Landing pages** | Full-width, stack vertical | Grid horizontal |
| **Onboarding wizard** | Full-screen por step | Card centralizado |

---

## 6. Navegação e Rotas

| Área | Rota | Tela |
|------|------|------|
| Empresa | `/dashboard` | Overview |
| Empresa | `/dashboard/programas` | Lista de programas |
| Empresa | `/dashboard/programas/novo` | Wizard de criação |
| Empresa | `/dashboard/programas/[id]` | Detalhe/edição |
| Empresa | `/dashboard/parceiros` | Lista de parceiros |
| Empresa | `/dashboard/indicacoes` | Lista de indicações |
| Empresa | `/dashboard/indicacoes/[id]` | Detalhe com timeline |
| Empresa | `/dashboard/comissoes` | Comissões |
| Empresa | `/dashboard/configuracoes` | Configurações (tabs) |
| Parceiro | `/parceiro` | Painel |
| Parceiro | `/parceiro/indicacoes` | Indicações |
| Parceiro | `/parceiro/extrato` | Extrato |
| Parceiro | `/parceiro/configuracoes` | Config + LGPD |
| Admin | `/admin` | Métricas |
| Admin | `/admin/empresas` | Empresas |
| Admin | `/admin/planos` | Planos e billing |
| Admin | `/admin/suporte` | Suporte |
| Admin | `/admin/configuracoes` | Config global |
| Público | `/` | Landing SaaS |
| Público | `/p/[slug]` | Landing programa |
| Público | `/privacidade` | Política de privacidade |
| Público | `/termos` | Termos de uso |
| Público | `/lgpd/contact` | Direitos do titular |

---

*Documento coerente com `design-system.md`, `ux-flows.md`, `product-spec.md` e `db-schema.md`.*
*Próxima etapa: ETAPA 5 — Desenvolvimento Backend (`@backend-chief`).*
