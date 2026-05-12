# Indica AÍ! — Design System (v1.0)

> Documento produzido por @ux-chief | 2026-05-12
> Dependências: `product-spec.md`, `architecture.md` (§1.2), `db-schema.md`, `lgpd-data-policy.md`, `ux-flows.md`
> Stack: Next.js 15 + React 19 + Tailwind CSS v4 + shadcn/ui (Radix)

---

## 1. Princípios de Design

| Princípio | Descrição |
|-----------|-----------|
| **Clareza sobre decoração** | Dona de ótica configura programa em 5 min sem tutorial. Zero jargão técnico. |
| **Mobile-first para parceiro** | Parceiro acessa pelo celular — link, extrato, saque Pix. Desktop é secundário. |
| **Densidade controlada para empresa** | Dashboard da empresa pode ser denso (dados importam), mas nunca confuso. |
| **Confiança visual** | Valores financeiros, status de pagamento e dados LGPD devem transmitir segurança. |
| **Consistência previsível** | Mesmo componente, mesma interação. O usuário não deve "reaprender" entre telas. |

---

## 2. Paleta de Cores

### 2.1 Cores Primárias

| Token | HEX | Tailwind | Uso |
|-------|-----|----------|-----|
| `--primary` | `#2563EB` | `bg-primary` / `text-primary` | Ações principais, links, CTA |
| `--primary-hover` | `#1D4ED8` | `hover:bg-primary-hover` | Hover de botões primários |
| `--primary-light` | `#DBEAFE` | `bg-primary-light` | Fundo de badges, destaques sutis |
| `--primary-dark` | `#1E40AF` | `text-primary-dark` | Texto sobre fundo claro |

### 2.2 Cores Secundárias

| Token | HEX | Tailwind | Uso |
|-------|-----|----------|-----|
| `--secondary` | `#7C3AED` | `bg-secondary` | Ações secundárias, destaques especiais |
| `--secondary-hover` | `#6D28D9` | `hover:bg-secondary-hover` | Hover secundário |
| `--secondary-light` | `#EDE9FE` | `bg-secondary-light` | Fundo de badges secundários |

### 2.3 Cores Semânticas

| Token | HEX | Tailwind | Uso |
|-------|-----|----------|-----|
| `--success` | `#16A34A` | `text-success` / `bg-success` | Status aprovado, pago, ativo |
| `--success-light` | `#DCFCE7` | `bg-success-light` | Fundo de badge de sucesso |
| `--warning` | `#D97706` | `text-warning` / `bg-warning` | Pendente, atenção, expirando |
| `--warning-light` | `#FEF3C7` | `bg-warning-light` | Fundo de badge de aviso |
| `--error` | `#DC2626` | `text-error` / `bg-error` | Erro, cancelado, reprovado |
| `--error-light` | `#FEE2E2` | `bg-error-light` | Fundo de badge de erro |
| `--info` | `#0284C7` | `text-info` / `bg-info` | Informação, dicas |
| `--info-light` | `#E0F2FE` | `bg-info-light` | Fundo de informativo |

### 2.4 Neutros

| Token | HEX | Tailwind | Uso |
|-------|-----|----------|-----|
| `--neutral-50` | `#F9FAFB` | `bg-neutral-50` | Fundo de página (claro) |
| `--neutral-100` | `#F3F4F6` | `bg-neutral-100` | Fundo de card, sidebar |
| `--neutral-200` | `#E5E7EB` | `border-neutral-200` | Bordas, separadores |
| `--neutral-300` | `#D1D5DB` | `border-neutral-300` | Bordas de inputs |
| `--neutral-400` | `#9CA3AF` | `text-neutral-400` | Placeholder, texto desabilitado |
| `--neutral-500` | `#6B7280` | `text-neutral-500` | Texto secundário |
| `--neutral-600` | `#4B5563` | `text-neutral-600` | Texto corpo |
| `--neutral-700` | `#374151` | `text-neutral-700` | Texto importante |
| `--neutral-800` | `#1F2937` | `text-neutral-800` | Títulos, headings |
| `--neutral-900` | `#111827` | `text-neutral-900` | Texto principal, headings fortes |
| `--neutral-950` | `#030712` | `text-neutral-950` | Fundo de página (escuro) |

### 2.5 Cores de Status de Indicação/Lead

| Status | Cor | Badge |
|--------|-----|-------|
| Novo lead | `--info` | `Novo` |
| Em atendimento | `--warning` | `Em atendimento` |
| Qualificado | `--secondary` | `Qualificado` |
| Fechou (venda) | `--success` | `Fechado` |
| Não fechou | `--neutral-400` | `Não fechou` |
| Comissão pendente | `--warning` | `Pendente` |
| Comissão aprovada | `--success` | `Aprovada` |
| Pago | `--success` | `Pago` |
| Cancelado | `--error` | `Cancelado` |

### 2.6 Tema Escuro

Variáveis CSS custom properties no `@theme` do Tailwind v4:

```css
@theme {
  --color-primary: oklch(0.55 0.2 260);       /* #2563EB */
  --color-primary-hover: oklch(0.48 0.2 260);  /* #1D4ED8 */
  --color-primary-light: oklch(0.95 0.04 260); /* #DBEAFE */
  --color-secondary: oklch(0.55 0.22 290);     /* #7C3AED */
  --color-success: oklch(0.6 0.18 145);        /* #16A34A */
  --color-warning: oklch(0.7 0.15 75);         /* #D97706 */
  --color-error: oklch(0.55 0.22 25);          /* #DC2626 */
  --color-info: oklch(0.55 0.15 230);          /* #0284C7 */
  --color-neutral-50: oklch(0.98 0.005 260);
  --color-neutral-100: oklch(0.96 0.008 260);
  --color-neutral-200: oklch(0.92 0.01 260);
  --color-neutral-300: oklch(0.87 0.012 260);
  --color-neutral-400: oklch(0.7 0.015 260);
  --color-neutral-500: oklch(0.55 0.018 260);
  --color-neutral-600: oklch(0.45 0.02 260);
  --color-neutral-700: oklch(0.35 0.02 260);
  --color-neutral-800: oklch(0.25 0.02 260);
  --color-neutral-900: oklch(0.15 0.02 260);
  --color-neutral-950: oklch(0.08 0.015 260);
}

/* Modo escuro: inverte neutros, ajusta saturação de cores */
.dark {
  --color-neutral-50: oklch(0.08 0.015 260);
  --color-neutral-100: oklch(0.12 0.02 260);
  --color-neutral-900: oklch(0.98 0.005 260);
  --color-neutral-950: oklch(0.99 0.003 260);
  --color-primary: oklch(0.65 0.2 260);        /* mais claro no escuro */
  --color-primary-light: oklch(0.2 0.08 260);   /* fundo escuro */
  --color-success: oklch(0.7 0.18 145);
  --color-error: oklch(0.65 0.22 25);
}
```

Toggle de tema: botão na sidebar inferior (sol/lua), persistido em `localStorage`, respeita `prefers-color-scheme` no primeiro acesso.

---

## 3. Tipografia

### 3.1 Família

**Inter** — variável (`font-sans`). Carregada via `next/font/google` com subsetting latino. Fallback: `system-ui, -apple-system, sans-serif`.

### 3.2 Escala Modular

| Token | Tamanho | Line-height | Peso | Uso |
|-------|---------|-------------|------|-----|
| `text-xs` | 0.75rem (12px) | 1rem | 400 | Labels auxiliares, timestamps |
| `text-sm` | 0.875rem (14px) | 1.25rem | 400 | Texto corpo secundário, table cells |
| `text-base` | 1rem (16px) | 1.5rem | 400 | Texto corpo principal |
| `text-lg` | 1.125rem (18px) | 1.75rem | 500 | Subtítulos de seção |
| `text-xl` | 1.25rem (20px) | 1.75rem | 600 | Títulos de card, nomes de programa |
| `text-2xl` | 1.5rem (24px) | 2rem | 700 | Títulos de página |
| `text-3xl` | 1.875rem (30px) | 2.25rem | 700 | Números de destaque (dashboard) |
| `text-4xl` | 2.25rem (36px) | 2.5rem | 800 | Estatísticas hero |
| `text-5xl` | 3rem (48px) | 1 | 800 | Landing page hero |

### 3.3 Pesos

| Peso | Uso |
|------|-----|
| 400 (`font-normal`) | Texto corpo |
| 500 (`font-medium`) | Labels, nav items, badges |
| 600 (`font-semibold`) | Subtítulos, card titles |
| 700 (`font-bold`) | Títulos de página, headings |
| 800 (`font-extrabold`) | Números hero, landing |

---

## 4. Espaçamento e Grid

### 4.1 Escala Base (4px)

| Token | Valor | Uso principal |
|-------|-------|---------------|
| `p-1` / `gap-1` | 4px | Espaçamento mínimo entre ícone e texto |
| `p-2` / `gap-2` | 8px | Padding interno de badge, botão pequeno |
| `p-3` / `gap-3` | 12px | Padding de input, spacing entre items em lista |
| `p-4` / `gap-4` | 16px | Padding de card, spacing padrão entre seções |
| `p-5` / `gap-5` | 20px | Padding de dialog, sheet |
| `p-6` / `gap-6` | 24px | Padding de page container, spacing entre blocos |
| `p-8` / `gap-8` | 32px | Spacing entre seções grandes |
| `p-10` / `gap-10` | 40px | Spacing hero sections (landing) |
| `p-12` / `gap-12` | 48px | Spacing seções de landing page |

### 4.2 Grid

- Container principal: `max-w-7xl` (1280px), `mx-auto`, `px-4 sm:px-6 lg:px-8`
- Grid de cards: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`
- Grid de stats: `grid grid-cols-2 lg:grid-cols-4 gap-4`
- Sidebar: `w-64` (256px) colapsável para `w-16` (64px, só ícones)

---

## 5. Sombras, Bordas e Radii

### 5.1 Sombras

| Token | Valor | Uso |
|-------|-------|-----|
| `shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | Cards, inputs |
| `shadow-md` | `0 4px 6px -1px rgba(0,0,0,0.1)` | Dropdowns, popovers |
| `shadow-lg` | `0 10px 15px -3px rgba(0,0,0,0.1)` | Dialogs, modais |
| `shadow-xl` | `0 20px 25px -5px rgba(0,0,0,0.1)` | Toast notifications |

### 5.2 Bordas

| Token | Valor | Uso |
|-------|-------|-----|
| `border` | `1px solid` + `--neutral-200` | Cards, separadores |
| `border-input` | `1px solid` + `--neutral-300` | Inputs, selects |
| `border-focus` | `2px solid` + `--primary` | Anel de foco (ring-2 ring-primary) |
| `border-error` | `1px solid` + `--error` | Input com erro |

### 5.3 Border Radius

| Token | Valor | Uso |
|-------|-------|-----|
| `rounded-sm` | 4px | Badges pequenos |
| `rounded-md` | 6px | Inputs, botões, cards |
| `rounded-lg` | 8px | Cards grandes, dialogs |
| `rounded-xl` | 12px | Avatar, imagem de perfil |
| `rounded-full` | 9999px | Avatar circular, indicadores de status |

---

## 6. Componentes shadcn/ui — Customizações

### 6.1 Button

| Variante | Classe | Uso |
|----------|--------|-----|
| `default` | `bg-primary text-white hover:bg-primary-hover` | Ação principal (Criar programa, Salvar) |
| `secondary` | `bg-secondary text-white hover:bg-secondary-hover` | Ação secundária (Convidar parceiro) |
| `outline` | `border border-neutral-300 text-neutral-700 hover:bg-neutral-100` | Ação neutra (Cancelar, Voltar) |
| `ghost` | `text-neutral-600 hover:bg-neutral-100` | Ação de texto (Editar, Ver mais) |
| `destructive` | `bg-error text-white hover:bg-error/90` | Ação destrutiva (Excluir, Suspender) |
| `link` | `text-primary underline` | Links inline |
| `icon` | `size-9 rounded-md` + variante outline | Botões de ação em tabela (editar, deletar) |

Tamanhos: `sm` (32px), `default` (36px), `lg` (40px). Spinner inline no estado loading.

### 6.2 Input

- Border-radius `rounded-md`
- Placeholder `text-neutral-400`
- Estado de erro: `border-error focus:ring-error`
- Ícone à esquerda via slot `<InputIcon>`
- Counter de caracteres para campos com limite (ex: nome do programa, max 80)

### 6.3 Select

- Trigger com `rounded-md`, mesma altura do Input
- Dropdown `shadow-md`, `rounded-lg`, `max-h-60 overflow-y-auto`
- Item selecionado com `bg-primary-light text-primary font-medium`
- Suporte a busca inline para listas >10 itens

### 6.4 Dialog

- `rounded-lg shadow-lg`
- Overlay: `bg-black/50 backdrop-blur-sm`
- Max-width `max-w-lg` (forms), `max-w-2xl` (detalhes)
- Botões de ação no footer: primário à direita, cancelar à esquerda
- Fechar com ESC e clique no overlay

### 6.5 Sheet

- Lateral direita para detalhes (lead, parceiro, comissão)
- Width: `w-full sm:w-[480px]`
- Header fixo com título + botão fechar
- Footer fixo com ações
- Scroll interno no conteúdo

### 6.6 Table

- Header `bg-neutral-50 text-neutral-600 text-sm font-medium`
- Rows com `hover:bg-neutral-50`
- Bordas apenas embaixo (`divide-y divide-neutral-200`)
- Coluna de ações alinhada à direita com botões icon
- Paginação no footer: "Mostrando X-Y de Z" + botões anterior/próximo
- Empty state centralizado quando sem dados

### 6.7 Tabs

- Tab list com `border-b border-neutral-200`
- Tab ativo: `border-b-2 border-primary text-primary font-medium`
- Tab inativo: `text-neutral-500 hover:text-neutral-700`

### 6.8 Card

- `rounded-lg border border-neutral-200 bg-white shadow-sm`
- Header com título (`text-lg font-semibold`) e ações (botões, dropdown)
- Padding `p-6`
- No modo escuro: `bg-neutral-900 border-neutral-800`

### 6.9 Badge

| Variante | Uso |
|----------|-----|
| `default` (primary) | Status neutro |
| `success` | Ativo, aprovado, pago |
| `warning` | Pendente, em análise |
| `destructive` | Erro, cancelado, reprovado |
| `secondary` | Informativo, secundário |
| `outline` | Contador, label |

Tamanho `text-xs px-2 py-0.5 rounded-sm`. Ícone opcional à esquerda (4px spacing).

### 6.10 Toast

- Posição: `bottom-right`
- Largura `max-w-sm`
- Tipos: success (borda esquerda verde), error (vermelha), warning (amarela), info (azul)
- Auto-dismiss em 5s (success/info), manual-dismiss para error
- Ação opcional (botão "Desfazer", "Tentar novamente")

### 6.11 DropdownMenu

- `rounded-lg shadow-md`, `min-w-48`
- Item com ícone à esquerda + label
- Separador entre grupos
- Item destrutivo em vermelho
- Shortcut de teclado à direita (ex: `⌘E`)

### 6.12 Form

- Label `text-sm font-medium text-neutral-700 mb-1.5`
- Descrição `text-xs text-neutral-500 mt-1`
- Erro `text-xs text-error mt-1` com ícone de alerta
- Agrupamento com `<FormField>` + `<FormItem>` + `<FormLabel>` + `<FormControl>` + `<FormMessage>`
- Validação via zod + react-hook-form: mensagens em PT-BR

### 6.13 Calendar

- Usado em filtros de período (leads, comissões)
- Presets: "Hoje", "Últimos 7 dias", "Últimos 30 dias", "Este mês", "Mês passado"
- Picker de range com dois meses visíveis em desktop

### 6.14 Toggle

- Botão de toggle para filtros ativos/inativos
- `rounded-md`, mesma estética do Button outline
- Estado ativo: `bg-primary-light text-primary`

### 6.15 Tooltip

- `bg-neutral-900 text-white text-xs rounded-md px-2 py-1 shadow-lg`
- Delay: 300ms
- Max-width `max-w-xs`
- Seta apontando para o elemento

### 6.16 Avatar

- `rounded-full`, tamanhos: `sm` (24px), `default` (32px), `lg` (40px), `xl` (56px)
- Fallback com iniciais do nome sobre fundo `primary-light`
- Status indicator (ponto verde/vermelho) no canto inferior direito

---

## 7. Componentes Próprios Derivados

### 7.1 StatCard

Card de estatística para o dashboard.

```
┌─────────────────────────────┐
│ Cliques nos últimos 7 dias  │  ← label (text-sm text-neutral-500)
│                            │
│        1.234               │  ← valor (text-3xl font-bold)
│                            │
│  ↑ 12% vs semana passada   │  ← delta (text-sm, verde/vermelho)
└─────────────────────────────┘
```

- Ícone opcional no canto superior direito
- Cor do delta: verde (positivo), vermelho (negativo), neutro (zero)
- Skeleton loading: retângulos animados no lugar de texto

### 7.2 EmptyState

Estado vazio centralizado para tabelas e listas.

```
        ┌─────┐
        │  📭 │  ← ilustração SVG genérica ou contextual
        └─────┘
   Nenhuma indicação ainda     ← título (text-lg font-semibold)
Compartilhe seu link para      ← descrição (text-sm text-neutral-500)
começar a receber indicações

   [ Copiar meu link ]         ← CTA opcional (Button primary)
```

- SVG contextual: indicações vazias, parceiros vazios, comissões vazias
- CTA principal quando ação óbvia existe

### 7.3 LeadStatusBadge

Badge especializado com cor + ícone por status do lead.

| Status | Cor | Ícone |
|--------|-----|-------|
| `new` | info | ponto (●) |
| `in_progress` | warning | relógio |
| `qualified` | secondary | check parcial |
| `closed` | success | check completo |
| `lost` | neutral-400 | X |

- Pill shape (`rounded-full`)
- Transição de cor ao mudar status (animação 200ms)

### 7.4 CommissionAmount

Componente para exibir valores de comissão com formatação BR.

```
R$ 1.250,00
pendente ← sublabel com status
```

- Moeda sempre em BRL com `Intl.NumberFormat('pt-BR')`
- Cor baseada no status: pendente (warning), aprovada (success), paga (success darker), cancelada (error)
- Skeleton loading para carregamento

### 7.5 CopyLinkButton

Botão com feedback visual de cópia.

```
┌─────────────────────────────────────┐
│ 🔗 indica.ai/r/karine-8xk92a       │  [ Copiar ]
└─────────────────────────────────────┘
```

- Input read-only com URL truncada em mobile
- Botão "Copiar" → muda para "Copiado!" com check por 2s
- Usa `navigator.clipboard.writeText()` com fallback para `document.execCommand`
- QR Code expansível ao clicar no ícone

### 7.6 RewardRulePreview

Preview ao vivo da regra configurada em linguagem natural.

```
┌─────────────────────────────────────────────┐
│  📋 Resumo da regra                         │
│                                             │
│  Toda vez que um indicado fechar uma venda, │
│  o parceiro recebe R$100 no Pix.            │
│                                             │
│  Condição: venda confirmada                 │
│  Pagamento: automático na aprovação         │
│  Valor mínimo: R$50                         │
│                                             │
│  [ Editar regra ]                           │
└─────────────────────────────────────────────┘
```

- Card com ícone de documento no header
- Texto gerado dinamicamente a partir do JSONB de regras
- Botão "Editar regra" volta ao wizard no step correto
- Atualiza em tempo real conforme usuário preenche o wizard

---

## 8. Tom de Voz e Copywriting PT-BR

### 8.1 Princípios

| Princípio | Exemplo |
|-----------|---------|
| Direto, sem jargão | "Indicações" não "leads"; "comissões" não "payouts" |
| Profissional mas acessível | "Seu programa está ativo" não "O sistema está operacional" |
| Orientado a ação | "Convide parceiros" não "Gerenciar parceiros" |
| Números em contexto | "3 novas indicações hoje" não "3 leads" |
| Empático em erros | "Algo deu errado, tente novamente" não "Erro 500" |

### 8.2 Microcopy — 15 Exemplos

| Contexto | Texto ruim (jargão) | Texto bom (Indica AÍ!) |
|----------|---------------------|------------------------|
| Dashboard vazio | "Nenhum lead encontrado" | "Nenhuma indicação ainda. Compartilhe seu link para começar!" |
| Status de comissão | "Payout pending" | "Aguardando aprovação" |
| Botão de ação | "Submit" | "Salvar programa" |
| Confirmação de cópia | "Copied to clipboard" | "Link copiado!" |
| Erro de rede | "Request failed with status 500" | "Algo deu errado. Tente novamente em alguns instantes." |
| Onboarding step | "Configure reward rules" | "Como o parceiro recebe?" |
| Lista vazia parceiros | "No partners found" | "Você ainda não convidou nenhum parceiro." |
| Ação destrutiva | "Delete" | "Excluir programa" |
| Tooltip de campo | "Attribution window" | "Por quantos dias depois do clique a indicação ainda conta?" |
| Banner de aviso | "Warning: unverified email" | "Confirme seu e-mail para desbloquear todas as funcionalidades." |
| Sucesso de pagamento | "Payout completed" | "Pagamento enviado para Karine via Pix!" |
| Filtro de período | "Date range" | "Período" |
| Contador de cliques | "Click count: 1,234" | "1.234 cliques" |
| Empty state comissões | "No payouts yet" | "Suas comissões aparecem aqui quando parceiros indicarem e as vendas forem confirmadas." |
| Convite enviado | "Invitation dispatched" | "Convite enviado para Karine! Ela vai receber um link por e-mail." |

### 8.3 Validação de Formulários (mensagens zod)

| Campo | Regra | Mensagem |
|-------|-------|----------|
| Email | `z.string().email()` | "Informe um e-mail válido" |
| Senha | `z.string().min(8)` | "A senha deve ter pelo menos 8 caracteres" |
| Nome empresa | `z.string().min(2)` | "Informe o nome da empresa" |
| CNPJ | `z.string().regex(...)` | "Informe um CNPJ válido" |
| Percentual | `z.number().min(0).max(100)` | "O percentual deve ser entre 0 e 100" |
| Valor R$ | `z.number().min(0.01)` | "Informe um valor maior que zero" |
| Telefone | `z.string().regex(...)` | "Informe um telefone com DDD" |
| Chave Pix | validação por tipo | "A chave Pix não é válida para o tipo selecionado" |

---

## 9. Acessibilidade

### 9.1 Contraste

- Mínimo **WCAG AA (4.5:1)** para texto normal, 3:1 para texto grande (≥18px bold ou ≥24px)
- Cores primárias e semânticas validadas contra fundo branco e fundo neutro-50
- Tema escuro: texto neutro-100 sobre fundo neutro-950 (contraste >7:1)

### 9.2 Foco Visível

```css
*:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
  border-radius: var(--radius-md);
}
```

- Anel de foco azul com offset de 2px
- Visível apenas para navegação por teclado (`:focus-visible`, não `:focus`)
- Removido em cliques de mouse

### 9.3 Suporte a Teclado

| Ação | Tecla |
|------|-------|
| Navegar entre elementos | `Tab` / `Shift+Tab` |
| Ativar botão/link | `Enter` / `Espaço` |
| Fechar dialog/sheet | `Escape` |
| Navegar em tabs | `←` / `→` |
| Navegar em dropdown | `↑` / `↓` + `Enter` |
| Selecionar em multi-select | `Espaço` |
| Abrir calendário | `Enter` no input de data |

### 9.4 Aria-labels Críticos

| Componente | Aria |
|------------|------|
| Botão de copiar link | `aria-label="Copiar link de indicação"` |
| Status badge | `aria-label="Status: Em atendimento"` |
| Botão fechar | `aria-label="Fechar"` |
| Toggle sidebar | `aria-label="Recolher menu lateral"` |
| Filtro de período | `aria-label="Filtrar por período"` |
| Ações em tabela | `aria-label="Ações para [nome do item]"` |
| Tab ativo | `aria-selected="true"` + `role="tab"` |
| Toast | `role="status"` + `aria-live="polite"` |
| Loading spinner | `aria-label="Carregando"` + `role="status"` |
| Empty state | `aria-live="polite"` para anunciar quando lista fica vazia |

### 9.5 Imagens e Ícones

- Todo ícone funcional (não decorativo) tem `aria-label`
- Imagens decorativas usam `alt=""`
- QR Code: `aria-label="QR Code do link de indicação"`
- Avatares: `alt="Foto de Karine"` ou `aria-hidden="true"` se decorativo

---

## 10. Tokens CSS Completos (Tailwind v4 @theme)

```css
@import "tailwindcss";

@theme {
  /* Cores primárias */
  --color-primary: #2563EB;
  --color-primary-hover: #1D4ED8;
  --color-primary-light: #DBEAFE;
  --color-primary-dark: #1E40AF;

  /* Cores secundárias */
  --color-secondary: #7C3AED;
  --color-secondary-hover: #6D28D9;
  --color-secondary-light: #EDE9FE;

  /* Semânticas */
  --color-success: #16A34A;
  --color-success-light: #DCFCE7;
  --color-warning: #D97706;
  --color-warning-light: #FEF3C7;
  --color-error: #DC2626;
  --color-error-light: #FEE2E2;
  --color-info: #0284C7;
  --color-info-light: #E0F2FE;

  /* Neutros */
  --color-neutral-50: #F9FAFB;
  --color-neutral-100: #F3F4F6;
  --color-neutral-200: #E5E7EB;
  --color-neutral-300: #D1D5DB;
  --color-neutral-400: #9CA3AF;
  --color-neutral-500: #6B7280;
  --color-neutral-600: #4B5563;
  --color-neutral-700: #374151;
  --color-neutral-800: #1F2937;
  --color-neutral-900: #111827;
  --color-neutral-950: #030712;

  /* Tipografia */
  --font-sans: 'Inter', system-ui, -apple-system, sans-serif;

  /* Radii */
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-xl: 12px;
}
```

---

## 11. Responsividade

### Breakpoints

| Token | Valor | Uso |
|-------|-------|-----|
| `sm` | 640px | Mobile landscape |
| `md` | 768px | Tablet |
| `lg` | 1024px | Desktop |
| `xl` | 1280px | Desktop grande |

### Padrões

- **Sidebar**: visível em `lg+`, colapsável em `<lg`, drawer em mobile
- **Tabelas**: scroll horizontal em mobile, ou cards empilhados (cada row vira um card)
- **Grid de stats**: `grid-cols-1` mobile, `grid-cols-2` tablet, `grid-cols-4` desktop
- **Sheet** substitui Dialog em mobile para formulários
- **Navegação do parceiro**: bottom tab bar em mobile, sidebar em desktop

---

*Documento referenciado por `wireframes.md` e pelo pacote `web/packages/ui/`.*
*Próxima revisão: quando o time de frontend implementar os primeiros componentes e identificar ajustes necessários.*
