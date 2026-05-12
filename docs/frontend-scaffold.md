# Frontend Scaffold — Indica AÍ!

> Documento produzido por `@frontend-chief` | 2026-05-12
> Descreve a estrutura do monorepo frontend, como rodar, e decisões técnicas.

---

## 1. Estrutura Criada

```
web/
├── pnpm-workspace.yaml          # workspaces: apps/*, packages/*
├── package.json                 # root com scripts cross-app via Turbo
├── biome.json                   # lint + format (Biome)
├── tsconfig.base.json           # strict: true, aliases @indica/*
├── turbo.json                   # pipeline: dev, build, lint, typecheck, test
├── .gitignore
├── .editorconfig
│
├── apps/
│   ├── dashboard/               # Área da empresa (porta 3000)
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── next.config.ts
│   │   ├── middleware.ts        # placeholder JWT + tenant injection
│   │   ├── .env.example
│   │   └── app/
│   │       ├── layout.tsx       # root layout com QueryProvider
│   │       ├── page.tsx         # placeholder
│   │       ├── components/providers/query-provider.tsx
│   │       ├── (auth)/          # route group: login, registro
│   │       │   ├── layout.tsx   # layout limpo, centralizado
│   │       │   └── login/page.tsx
│   │       ├── (app)/           # route group: app autenticado
│   │       │   ├── layout.tsx   # sidebar + header
│   │       │   ├── dashboard/page.tsx
│   │       │   ├── programs/page.tsx
│   │       │   ├── partners/page.tsx
│   │       │   ├── leads/page.tsx
│   │       │   ├── rewards/page.tsx
│   │       │   └── settings/page.tsx
│   │       └── (admin)/         # route group: admin do SaaS
│   │           ├── layout.tsx
│   │           └── admin/
│   │               ├── page.tsx
│   │               └── tenants/page.tsx
│   │
│   ├── partner/                 # Painel do parceiro (porta 3001)
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── next.config.ts
│   │   ├── middleware.ts        # placeholder JWT parceiro
│   │   ├── .env.example
│   │   └── app/
│   │       ├── layout.tsx
│   │       ├── page.tsx
│   │       ├── components/providers/query-provider.tsx
│   │       ├── (auth)/          # magic link login
│   │       │   ├── layout.tsx
│   │       │   └── login/page.tsx
│   │       └── (app)/           # app autenticado do parceiro
│   │           ├── layout.tsx
│   │           ├── dashboard/page.tsx
│   │           ├── referrals/page.tsx
│   │           ├── earnings/page.tsx
│   │           └── profile/page.tsx
│   │
│   └── public/                  # Landings + widget (porta 3002)
│       ├── package.json
│       ├── tsconfig.json
│       ├── next.config.ts
│       ├── .env.example
│       └── app/
│           ├── layout.tsx
│           ├── page.tsx         # landing SaaS principal
│           ├── p/[slug]/page.tsx  # landing do programa (ISR)
│           └── r/[slug]/page.tsx  # tracking fallback
│
└── packages/
    ├── ui/                      # shadcn/ui wrapper
    │   ├── package.json
    │   ├── tsconfig.json
    │   ├── components.json      # shadcn CLI config
    │   └── src/
    │       ├── index.ts
    │       ├── lib/utils.ts     # cn() = clsx + tailwind-merge
    │       ├── styles/globals.css  # Tailwind v4 + @theme placeholder
    │       ├── components/ui/   # 10 componentes placeholder
    │       │   ├── button.tsx
    │       │   ├── input.tsx
    │       │   ├── card.tsx
    │       │   ├── dialog.tsx
    │       │   ├── sheet.tsx
    │       │   ├── form.tsx
    │       │   ├── label.tsx
    │       │   ├── table.tsx
    │       │   ├── tabs.tsx
    │       │   ├── toast.tsx
    │       │   └── dropdown-menu.tsx
    │       └── store/example.ts # Zustand store de exemplo
    │
    ├── api-client/              # Cliente TS para API Go
    │   ├── package.json
    │   ├── tsconfig.json
    │   └── src/
    │       ├── index.ts         # createClient() com fetch wrapper
    │       ├── auth.ts          # login, logout, me, magic link
    │       ├── programs.ts      # CRUD programas
    │       ├── partners.ts      # CRUD parceiros + stats
    │       └── leads.ts         # CRUD leads + rewards
    │
    └── tracking/                # Widget JS embarcável
        ├── package.json         # build IIFE via tsup
        ├── tsconfig.json
        └── src/widget.ts        # init(), lê cookie _iaref, posta events
```

---

## 2. Como Rodar

```bash
# 1. Entrar na pasta web/
cd web

# 2. Instalar dependências
pnpm install

# 3. Levantar todos os apps em dev (via Turbo)
pnpm dev
# Dashboard: http://localhost:3000
# Partner:   http://localhost:3001
# Public:    http://localhost:3002

# 4. Comandos úteis
pnpm lint        # Biome lint em todos os pacotes
pnpm typecheck   # TypeScript check em todos os pacotes
pnpm build       # Build de produção de todos os apps
```

---

## 3. Mapa Wireframe → Arquivo

Cada página criada tem um TODO apontando para o wireframe correspondente:

| Wireframe | Arquivo | Descrição |
|-----------|---------|-----------|
| 1a | `apps/public/app/page.tsx` | Landing page SaaS |
| 2a | `apps/dashboard/app/(auth)/login/page.tsx` | Login da empresa |
| 3a | `apps/dashboard/app/(app)/layout.tsx` | Sidebar + header |
| 4a | `apps/dashboard/app/(app)/dashboard/page.tsx` | Dashboard principal |
| 5a | `apps/dashboard/app/(app)/programs/page.tsx` | Lista de programas |
| 6a | `apps/dashboard/app/(app)/partners/page.tsx` | Lista de parceiros |
| 7a | `apps/dashboard/app/(app)/leads/page.tsx` | Lista de leads |
| 8a | `apps/dashboard/app/(app)/rewards/page.tsx` | Recompensas |
| 9a | `apps/dashboard/app/(app)/settings/page.tsx` | Configurações |
| 10a | `apps/dashboard/app/(admin)/admin/page.tsx` | Painel admin |
| 11a | `apps/dashboard/app/(admin)/admin/tenants/page.tsx` | Gestão de tenants |
| 12a | `apps/partner/app/(auth)/login/page.tsx` | Login parceiro (magic link) |
| 13a | `apps/partner/app/(app)/layout.tsx` | Layout parceiro |
| 14a | `apps/partner/app/(app)/dashboard/page.tsx` | Dashboard parceiro |
| 15a | `apps/partner/app/(app)/referrals/page.tsx` | Indicações do parceiro |
| 16a | `apps/partner/app/(app)/earnings/page.tsx` | Extrato de comissões |
| 17a | `apps/partner/app/(app)/profile/page.tsx` | Perfil do parceiro |
| 18a | `apps/public/app/p/[slug]/page.tsx` | Landing do programa |

---

## 4. Integração com Design System do @ux-chief

**Status: INTEGRADO** (2026-05-12)

Design system fonte: `docs/design-system.md` (v1.0, @ux-chief)

### O que foi integrado

1. **`web/packages/ui/src/styles/globals.css`** — tokens CSS completos:
   - Paleta primária (primary, primary-hover, primary-light, primary-dark)
   - Paleta secundária (secondary, secondary-hover, secondary-light)
   - Cores semânticas (success, warning, error, info + light variants)
   - Escala de neutros (50 a 950)
   - Modo escuro (`.dark` class toggle)
   - Tipografia Inter via `--font-sans`
   - Radii (sm, md, lg, xl)
   - Focus visible para acessibilidade WCAG

2. **Componentes shadcn/ui customizados** (variantes do design system):
   - `Button` — variantes: default, secondary, outline, ghost, destructive, link + loading state
   - `Badge` — variantes: default, success, warning, destructive, secondary, outline
   - `Input`, `Card`, `Table`, `Tabs`, `Dialog`, `Sheet`, `Form`, `Label`, `DropdownMenu`, `Toast`

3. **Componentes derivados Indica AÍ!** (§7 do design system):
   - `StatCard` — card de KPI com delta, skeleton loading
   - `EmptyState` — estado vazio centralizado com CTA
   - `LeadStatusBadge` — badge com cor/ícone por status (new, contacted, qualified, closed, lost)
   - `CommissionAmount` — valor BRL formatado com status color
   - `CopyLinkButton` — link de indicação com feedback de cópia
   - `RewardRulePreview` — preview em linguagem natural da regra configurada

### Como usar

```tsx
import { Button, Badge, StatCard, LeadStatusBadge, CopyLinkButton } from "@indica/ui";

// Botão primário
<Button>Criar programa</Button>

// Badge de status
<Badge variant="success">Ativo</Badge>

// StatCard no dashboard
<StatCard label="Cliques nos últimos 7 dias" value="1.234" delta={{ value: "↑ 12%", positive: true }} />

// Status do lead
<LeadStatusBadge status="closed" />

// Copiar link
<CopyLinkButton url="https://indica.ai/r/karine-8xk92a" />
```

---

## 5. Decisão: Admin como Route Group dentro de Dashboard

**Decisão:** área admin é route group `(admin)` dentro do app `dashboard`.

**Justificativa:**

1. **Mesmo domínio de autenticação.** Admin e empresa usam o mesmo sistema de login (email/senha). A diferença é apenas o `role: saas_admin` no JWT. Separar em app próprio duplicaria a infra de auth.

2. **Middleware único.** O `middleware.ts` do dashboard já verifica o cookie HttpOnly e pode redirecionar `/admin/*` para `/login` se não for admin. Um app separado teria seu próprio middleware com lógica duplicada.

3. **Compartilha UI.** Muitos componentes (tabelas, formulários, layout base) são idênticos entre admin e empresa. Compartilhar via `@indica/ui` é mais fácil dentro do mesmo app.

4. **Deploy único na Vercel.** Um único Next.js app = um único deploy. Menos configuração, menos variáveis de ambiente, menos domínios.

5. **Isolamento via middleware.** A verificação `role !== "saas_admin" → redirect` no middleware garante que usuários normais não acessem `/admin/*`. O RLS no backend é a segunda barreira.

**Quando separar:** se o admin crescer muito (dezenas de telas próprias, dependências exclusivas), pode fazer sentido migrar para `web/apps/admin/` no futuro. A estrutura de monorepo com pnpm workspaces permite isso sem refactor massivo.

---

## 6. Dependências Instaladas

### Root
- `turbo` — orchestration de scripts cross-app
- `@biomejs/biome` — lint + format

### Apps (cada um)
- `next` 15, `react` 19, `react-dom` 19
- `typescript` 5.7+, `tailwindcss` 4, `@tailwindcss/postcss`
- `@tanstack/react-query` v5 (dashboard, partner)
- `@tanstack/react-table` v8 (dashboard, partner)
- `react-hook-form` + `zod` + `@hookform/resolvers`
- `zustand` v5
- `recharts` (apenas dashboard)

### Packages
- `@indica/ui` — radix primitives, cva, clsx, tailwind-merge, lucide-react
- `@indica/api-client` — puro TS, sem deps
- `@indica/tracking` — tsup para build IIFE

---

## 7. Próximos Passos

1. ~~**Aguardar `docs/design-system.md`** do `@ux-chief` → atualizar `globals.css` com tokens~~ ✅ FEITO
2. ~~**Aguardar `docs/wireframes.md`** do `@ux-chief` → implementar telas reais nos placeholders~~ ✅ FEITO
3. **Rodar `npx shadcn@latest add`** para componentes extras (Calendar, Select, Tooltip, Avatar) quando necessário
4. **Configurar CI** — `pnpm lint && pnpm typecheck && pnpm build` no GitHub Actions
5. **Gerar `api-client`** da OpenAPI quando o backend estiver pronto (`openapi-typescript`)
6. **Integrar dados reais** — trocar mocks por TanStack Query calls quando API estiver pronta
7. **Testes E2E** — Playwright nos fluxos principais (onboarding, criar programa, indicação)
