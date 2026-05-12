# Frontend Walkthrough — Checklist de Validação

> Guia para validar visualmente todo o frontend **antes** da integração com o backend Go.
> Cada seção cobre uma rota. Marque ✅ quando a tela estiver visualmente correta.

---

## Dashboard (`:3000`)

### Auth

- [ ] **`/login`** — Formulário com e-mail + senha, validação zod, "Esqueci a senha" → `/forgot-password`, "Cadastre-se" → `/register`. Toast "Login simulado" → redirect `/dashboard`.
- [ ] **`/register`** — Formulário com nome + e-mail + senha, botão Google OAuth (toast), validação zod, "Já tem conta?" → `/login`. Toast "Conta criada" → redirect `/dashboard`.
- [ ] **`/forgot-password`** — E-mail input, botão "Enviar link", tela de confirmação "Verifique seu e-mail", botão "Voltar".

### App (sidebar + header)

- [ ] **Sidebar** — Links: Visão geral, Programas, Parceiros, Indicações, Comissões, Configurações. Tenant switcher no rodapé com 3 empresas mock (Wenox Inox, Ótica Visão+, Academia Ferro+). Links funcionam sem `/dashboard` prefix.
- [ ] **Header** — Busca, notificações, avatar.

### Telas Principais

- [ ] **`/dashboard`** — 4 StatCards (Cliques, Indicações novas, Comissão a pagar, Parceiros ativos). Gráfico de barras "Cliques por dia" (Recharts). Top parceiros. Indicações recentes com badges de status. Link "Ver tudo" → `/indicacoes`.
- [ ] **`/programas`** — Cards por programa (Wenox, Ótica Premium) com status, métricas, CopyLinkButton, botão "Editar" → `/programas/[id]`, botão "+ Novo programa" → `/programas/novo`.
- [ ] **`/programas/novo`** — Wizard 4 steps: Nome → Regra (comissão/meta/split) → Destino (WhatsApp/site/landing) → Revisão. RewardRulePreview. Toast "Programa publicado" → redirect `/programas`.
- [ ] **`/programas/[id]`** — Formulário de edição com nome, descrição, status, CopyLinkButton. Botões "Salvar" e "Pausar" com toast.
- [ ] **`/parceiros`** — Tabela com 8 parceiros (mock centralizado). Busca por nome/e-mail. Filtro por programa. Colunas: Nome, E-mail, Telefone, Programa, Indic., Cliques, Comissão, Status. Click na linha abre Sheet. Botão "Cadastrar parceiro" abre Sheet com formulário de convite.
- [ ] **`/parceiros` Sheet** — Detalhes do parceiro: nome, e-mail, telefone, programa, status, link de indicação (CopyLinkButton), chave PIX, métricas. Botões "Enviar e-mail" e "Suspender" com toast.
- [ ] **`/indicacoes`** — Tabela com 20 indicações (mock centralizado). Busca por nome/telefone/parceiro. Filtro por status. Colunas: Nome, Telefone, Parceiro, Status (LeadStatusBadge), Valor potencial, Data. Click na linha abre Sheet. Botões "Aprovar selecionados" e "Exportar CSV" com toast.
- [ ] **`/indicacoes` Sheet** — Detalhes: nome, status, parceiro, telefone, programa, origem, valor potencial, data. Timeline dinâmica baseada no status. Select para alterar status. Textarea para notas. Botão "Salvar" com toast.
- [ ] **`/comissoes`** — 4 StatCards (Pendente, Aprovada, Pagas, Canceladas). Tabela com checkboxes, filtros (status, período, programa). Colunas: checkbox, Parceiro, Indicação, Valor, Status, Ação. Botão "Aprovar" individual com toast. Ações em lote: "Aprovar selecionados", "Rejeitar selecionados".
- [ ] **`/configuracoes`** — 6 abas: Perfil (nome, e-mail, telefone, senha, zona de perigo), Empresa (nome, CNPJ, subdomínio), WhatsApp (número, mensagem padrão), Webhooks (lista + adicionar), Equipe (membros + convite), Billing (plano atual + faturas). Todos os botões com toast.

### Admin (`:3000/admin`)

- [ ] **Sidebar admin** — Links: Métricas, Tenants. Badge "Admin". Link "Voltar ao app" → `/dashboard`.
- [ ] **`/admin`** — 4 StatCards (MRR, Tenants ativos, Trial, Churn). Gráfico MRR 6 meses (Recharts). Últimos 5 tenants com status. Link "Ver todos os tenants".
- [ ] **`/admin/tenants`** — Tabela com 10 tenants. Busca por nome. Filtro por status. Colunas: Nome (com subdomínio), Plano, Status, Parceiros, MRR, Criado em, Ações. Botões "Acessar" (impersonate toast) e "Suspender" (toast). Botão "Convidar tenant" (toast).

---

## Partner (`:3003`)

### Auth

- [ ] **`/`** — Redirect para `/login`.
- [ ] **`/login`** — Magic link flow: e-mail input, botão "Enviar link de acesso", tela "Verifique seu e-mail", auto-redirect `/parceiro` após 2s. Botão "Voltar".

### App (bottom tab bar mobile / sidebar desktop)

- [ ] **Nav** — Painel, Indicações, Extrato, Config.

### Telas Principais

- [ ] **`/parceiro`** — "Olá, Karine!". Link de indicação (CopyLinkButton), botão "Compartilhar via WhatsApp" com toast. 3 StatCards (Saldo, Indicações ativas, Próximo pagamento). Últimas 3 indicações com badges. Link "+ Cadastrar indicação manual" → `/parceiro/indicacoes/nova`.
- [ ] **`/parceiro/indicacoes`** — Cards com status, valor, comissão. Filtros (status, período). Timeline expansível por indicação. Botão "Carregar mais".
- [ ] **`/parceiro/indicacoes/nova`** — Formulário: nome, WhatsApp, e-mail, split flexível (rádios), notas. Botão "Voltar". Toast "Indicação cadastrada" → redirect.
- [ ] **`/parceiro/extrato`** — Resumo (Saldo R$450, Pendente R$200, Pago R$1.350). Botão "Solicitar saque Pix" abre Dialog. Chave PIX. Histórico de transações com badges.
- [ ] **`/parceiro/configuracoes`** — Dados pessoais (nome, e-mail, telefone, chave PIX). LGPD (copiar dados, corrigir, excluir). Notificações (toggles). Todos os botões com toast.

---

## Public (`:3002`)

- [ ] **`/`** — Landing page: header com "Entrar". Hero "Transforme seus clientes em canais de venda". 3 steps. Seção "Para quem é". Pricing (Free/Starter/Pro). CTA. Footer.
- [ ] **`/p/[slug]`** — Landing page do programa (nome, descrição, CTA).
- [ ] **`/r/[slug]`** — Tracking redirect (registra clique, redireciona).
- [ ] **`/lgpd/contact`** — Formulário de contato LGPD.

---

## Validações Globais

- [ ] **Toasts** — Todo botão de ação (salvar, enviar, aprovar, suspender, excluir) mostra feedback via toast.
- [ ] **Navegação** — Todos os links apontam para rotas existentes. Nenhum link quebrado.
- [ ] **Mock data** — Dados centralizados em `packages/api-client/src/mocks/`. BR realism: R$, telefones +55, CPF/CNPJ formatados.
- [ ] **Responsividade** — Testar em viewport mobile (sidebar vira hamburger/bottom tab).
- [ ] **Dark mode** — Alternar tema e verificar contraste.
- [ ] **Sem `any`** — TypeScript strict, nenhum `any` no código.

---

## Dados Mock Disponíveis

| Arquivo | Qtd | Descrição |
|---------|-----|-----------|
| `partners.mock.ts` | 8 | Parceiros com nome, e-mail, telefone, PIX, status |
| `referrals.mock.ts` | 20 | Indicações com 5 status, 3 origens, valor potencial |
| `programs.mock.ts` | 4 | Programas (flexible_split, commission_fixed, goal_based, paused) |
| `tenants.mock.ts` | 10 | Empresas com planos Free→Enterprise, MRR, CNPJ |
| `commissions.mock.ts` | 10 | Comissões em 4 estados |

---

## Portas

| App | Porta | URL |
|-----|-------|-----|
| Dashboard | 3000 | http://localhost:3000 |
| Public | 3002 | http://localhost:3002 |
| Partner | 3003 | http://localhost:3003 |
