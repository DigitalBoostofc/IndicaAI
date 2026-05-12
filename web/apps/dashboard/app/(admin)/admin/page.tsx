"use client";

import { StatCard } from "@indica/ui";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import Link from "next/link";
import { mockTenants } from "@indica/api-client/mocks";
import { Button } from "@indica/ui";

const formatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const mrrHistory = [
  { mes: "Dez", mrr: 18200 },
  { mes: "Jan", mrr: 19800 },
  { mes: "Fev", mrr: 21400 },
  { mes: "Mar", mrr: 22100 },
  { mes: "Abr", mrr: 23500 },
  { mes: "Mai", mrr: 24580 },
];

const recentTenants = mockTenants.slice(0, 5);

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
          Admin — Métricas da Plataforma
        </h1>
        <Link href="/admin/tenants">
          <Button variant="outline" size="sm">
            Ver todos os tenants
          </Button>
        </Link>
      </div>

      {/* StatCards — MRR, Tenants ativos, Trial, Churn */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="MRR"
          value={formatter.format(24580)}
          delta={{ value: "↑ 4.6% vs mês passado", positive: true }}
        />
        <StatCard
          label="Tenants ativos"
          value="87"
          delta={{ value: "↑ 5 novos este mês", positive: true }}
        />
        <StatCard
          label="Tenants em trial"
          value="12"
          delta={{ value: "↑ 3 novos esta semana", positive: true }}
        />
        <StatCard
          label="Churn 30 dias"
          value="2.3%"
          delta={{ value: "↓ 0.5% vs mês passado", positive: true }}
        />
      </div>

      {/* Gráfico MRR + Últimos tenants */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Gráfico evolução MRR */}
        <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 lg:col-span-2">
          <h2 className="text-lg font-semibold">Evolução MRR (6 meses)</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mrrHistory}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-neutral-200 dark:stroke-neutral-800"
                />
                <XAxis dataKey="mes" className="text-xs" />
                <YAxis
                  className="text-xs"
                  tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid #E5E7EB",
                    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                  }}
                  formatter={(value: number) => [
                    formatter.format(value),
                    "MRR",
                  ]}
                />
                <Bar dataKey="mrr" fill="#2563EB" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Últimos tenants criados */}
        <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="text-lg font-semibold">Últimos tenants criados</h2>
          <div className="mt-4 space-y-3">
            {recentTenants.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between border-b border-neutral-100 pb-3 last:border-0 dark:border-neutral-800"
              >
                <div>
                  <p className="text-sm font-medium">{t.nome}</p>
                  <p className="text-xs text-neutral-500">
                    {t.plano} · {t.criadoEm}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    t.status === "active"
                      ? "bg-success-light text-success"
                      : t.status === "trial"
                        ? "bg-warning-light text-warning"
                        : "bg-error-light text-error"
                  }`}
                >
                  {t.status === "active"
                    ? "Ativo"
                    : t.status === "trial"
                      ? "Trial"
                      : "Suspenso"}
                </span>
              </div>
            ))}
          </div>
          <Link href="/admin/tenants">
            <Button variant="ghost" size="sm" className="mt-3 w-full">
              Ver todos os tenants
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
