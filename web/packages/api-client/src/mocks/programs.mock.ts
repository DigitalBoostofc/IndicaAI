export interface MockProgram {
  id: string;
  nome: string;
  descricao: string;
  status: "active" | "paused" | "draft";
  parceiros: number;
  cliques: number;
  comissao: number;
  regra: string;
  tipoRegra: "flexible_split" | "commission_fixed" | "goal_based";
  link: string;
  tenantId: string;
  criadoEm: string;
}

export const mockPrograms: MockProgram[] = [
  {
    id: "1",
    nome: "Programa de Indicação Wenox",
    descricao: "Split 20% comissão/desconto — parceiro decide como usar o benefício.",
    status: "active",
    parceiros: 3,
    cliques: 145,
    comissao: 2400,
    regra: "Split 20% comissão/desconto",
    tipoRegra: "flexible_split",
    link: "indica.ai/r/wenox-abc123",
    tenantId: "t1",
    criadoEm: "2026-02-15",
  },
  {
    id: "2",
    nome: "Ótica Premium — Indique e Ganhe",
    descricao: "R$100 por venda confirmada via Pix. Meta de 5 indicações = óculos grátis.",
    status: "active",
    parceiros: 8,
    cliques: 312,
    comissao: 800,
    regra: "R$100 por venda confirmada (Pix)",
    tipoRegra: "commission_fixed",
    link: "indica.ai/r/otica-prem-xyz789",
    tenantId: "t2",
    criadoEm: "2026-03-01",
  },
  {
    id: "3",
    nome: "Academia Ferro+ — Indique Amigos",
    descricao: "Indique 5 amigos que assinarem e ganhe 1 mês grátis.",
    status: "active",
    parceiros: 12,
    cliques: 520,
    comissao: 0,
    regra: "5 indicações convertidas = 1 mês grátis",
    tipoRegra: "goal_based",
    link: "indica.ai/r/academia-ferro-def456",
    tenantId: "t3",
    criadoEm: "2026-01-20",
  },
  {
    id: "4",
    nome: "Clínica Sorria — Programa Sorriso",
    descricao: "15% de comissão sobre procedimentos indicados.",
    status: "paused",
    parceiros: 5,
    cliques: 89,
    comissao: 450,
    regra: "15% sobre procedimento",
    tipoRegra: "commission_fixed",
    link: "indica.ai/r/clinica-sorria-ghi789",
    tenantId: "t4",
    criadoEm: "2026-04-05",
  },
];
