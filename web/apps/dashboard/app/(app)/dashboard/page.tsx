"use client";

import { useEffect, useState } from "react";
import { StatCard, Badge, Button } from "@indica/ui";
import Link from "next/link";
import { ClicksChart } from "./clicks-chart";
import {
  dashboardApi,
  type DashboardOverview,
  ApiError,
} from "../../lib/api";

const formatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
});

function fmtDelta(pct: number) {
  if (pct === 0) {
    return { value: "→ 0% vs semana passada", neutral: true as const };
  }
  const positive = pct > 0;
  const arrow = positive ? "↑" : "↓";
  return {
    value: `${arrow} ${Math.abs(pct).toFixed(0)}% vs semana passada`,
    positive,
  };
}

function statusLabel(status: string) {
  if (status === "closed" || status === "won") return "Fechado";
  if (status === "contacted") return "Em atendimento";
  if (status === "lost") return "Perdido";
  return "Novo";
}

function statusBadge(status: string) {
  if (status === "closed" || status === "won") return "success" as const;
  if (status === "contacted") return "warning" as const;
  if (status === "lost") return "destructive" as const;
  return "default" as const;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    dashboardApi
      .overview()
      .then(setData)
      .catch((e: ApiError) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-sm text-neutral-500">Carregando dashboard...</p>;
  }
  if (error) {
    return (
      <div className="rounded-lg border border-error/30 bg-error/5 p-4 text-sm text-error">
        {error}
      </div>
    );
  }
  if (!data) return null;

  const chartData = data.clicks_per_day.map((d) => ({
    day: d.day,
    cliques: d.count,
  }));

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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Cliques nos últimos 7 dias"
          value={data.clicks_last_7_days.toLocaleString("pt-BR")}
          delta={fmtDelta(data.clicks_delta_pct)}
        />
        <StatCard
          label="Indicações novas"
          value={data.new_leads_last_7_days.toLocaleString("pt-BR")}
          delta={fmtDelta(data.leads_delta_pct)}
        />
        <StatCard
          label="Comissão a pagar"
          value={formatter.format(data.pending_rewards_cents / 100)}
        />
        <StatCard
          label="Parceiros ativos"
          value={data.active_partners.toLocaleString("pt-BR")}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 lg:col-span-2">
          <h2 className="text-lg font-semibold">Cliques por dia</h2>
          <div className="mt-4 h-64">
            <ClicksChart data={chartData} />
          </div>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="text-lg font-semibold">Top parceiros</h2>
          {data.top_partners.length === 0 ? (
            <p className="mt-4 text-sm text-neutral-500">
              Nenhum parceiro ainda.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {data.top_partners.map((p, i) => (
                <div
                  key={p.name + i}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-light text-xs font-bold text-primary">
                      {i + 1}
                    </span>
                    <span className="text-sm font-medium">{p.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm">{p.referrals} ind.</p>
                    <p className="text-xs text-neutral-500">
                      {formatter.format(p.amount_cents / 100)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4 dark:border-neutral-800">
          <h2 className="text-lg font-semibold">Indicações recentes</h2>
          <Link href="/indicacoes">
            <Button variant="ghost" size="sm">
              Ver tudo
            </Button>
          </Link>
        </div>
        {data.recent_leads.length === 0 ? (
          <p className="px-6 py-6 text-sm text-neutral-500">
            Nenhuma indicação ainda. Compartilhe seu link para começar.
          </p>
        ) : (
          <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {data.recent_leads.map((lead) => (
              <div
                key={lead.id}
                className="flex items-center justify-between px-6 py-3"
              >
                <div className="flex items-center gap-4">
                  <span className="font-medium">{lead.name}</span>
                  <span className="text-sm text-neutral-500">
                    {lead.partner_name}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant={statusBadge(lead.status)}>
                    {statusLabel(lead.status)}
                  </Badge>
                  <span className="text-sm text-neutral-500">
                    {dateFormatter.format(new Date(lead.created_at))}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
