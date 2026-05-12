// Wireframe §1.2 — Dashboard Overview
// 4 StatCards, gráfico de barras (Recharts), tabela de indicações recentes

import { StatCard, Badge, Button } from "@indica/ui";
import Link from "next/link";
import { ClicksChart } from "./clicks-chart";

const formatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

// Dados mock — futuramente virão do TanStack Query
const chartData = [
  { day: "Seg", cliques: 120 },
  { day: "Ter", cliques: 180 },
  { day: "Qua", cliques: 95 },
  { day: "Qui", cliques: 220 },
  { day: "Sex", cliques: 170 },
  { day: "Sáb", cliques: 85 },
  { day: "Dom", cliques: 64 },
];

const recentLeads = [
  { nome: "Maria Silva", parceiro: "Karine", status: "closed" as const, data: "12/05" },
  { nome: "José Souza", parceiro: "Pedro", status: "contacted" as const, data: "11/05" },
  { nome: "Ana Costa", parceiro: "Karine", status: "new" as const, data: "11/05" },
];

const topParceiros = [
  { nome: "Karine", indicacoes: 15, valor: 15000 },
  { nome: "Pedro", indicacoes: 8, valor: 8000 },
  { nome: "Ana", indicacoes: 5, valor: 5000 },
  { nome: "João", indicacoes: 3, valor: 3000 },
];

const statusColors: Record<string, string> = {
  closed: "text-success",
  contacted: "text-warning",
  new: "text-info",
};

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
          Visão geral
        </h1>
        <select className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900">
          <option>7 dias</option>
          <option>30 dias</option>
          <option>90 dias</option>
        </select>
      </div>

      {/* StatCards — wireframe: Cliques | Indic. novas | Comissão | Parceiros */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Cliques nos últimos 7 dias"
          value="1.234"
          delta={{ value: "↑ 12% vs semana passada", positive: true }}
        />
        <StatCard
          label="Indicações novas"
          value="23"
          delta={{ value: "↑ 8% vs semana passada", positive: true }}
        />
        <StatCard
          label="Comissão a pagar"
          value={formatter.format(2400)}
          delta={{ value: "↓ 3% vs semana passada", positive: false }}
        />
        <StatCard
          label="Parceiros ativos"
          value="12"
          delta={{ value: "→ 0% vs semana passada", neutral: true }}
        />
      </div>

      {/* Gráfico + Top parceiros */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Gráfico de barras — wireframe: Cliques por dia */}
        <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 lg:col-span-2">
          <h2 className="text-lg font-semibold">Cliques por dia</h2>
          <div className="mt-4 h-64">
            <ClicksChart data={chartData} />
          </div>
        </div>

        {/* Top parceiros — wireframe: 1. Karine 15 ind. R$15k */}
        <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="text-lg font-semibold">Top parceiros</h2>
          <div className="mt-4 space-y-3">
            {topParceiros.map((p, i) => (
              <div key={p.nome} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-light text-xs font-bold text-primary">
                    {i + 1}
                  </span>
                  <span className="text-sm font-medium">{p.nome}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm">{p.indicacoes} ind.</p>
                  <p className="text-xs text-neutral-500">{formatter.format(p.valor)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Indicações recentes — wireframe: Nome | Parceiro | Status | Data */}
      <div className="rounded-lg border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4 dark:border-neutral-800">
          <h2 className="text-lg font-semibold">Indicações recentes</h2>
          <Link href="/indicacoes">
            <Button variant="ghost" size="sm">Ver tudo</Button>
          </Link>
        </div>
        <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
          {recentLeads.map((lead) => (
            <div key={lead.nome} className="flex items-center justify-between px-6 py-3">
              <div className="flex items-center gap-4">
                <span className="font-medium">{lead.nome}</span>
                <span className="text-sm text-neutral-500">{lead.parceiro}</span>
              </div>
              <div className="flex items-center gap-4">
                <Badge
                  variant={
                    lead.status === "closed"
                      ? "success"
                      : lead.status === "contacted"
                        ? "warning"
                        : "default"
                  }
                >
                  {lead.status === "closed" ? "Fechado" : lead.status === "contacted" ? "Em atendimento" : "Novo"}
                </Badge>
                <span className="text-sm text-neutral-500">{lead.data}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
