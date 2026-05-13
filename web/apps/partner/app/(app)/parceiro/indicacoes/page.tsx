"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button } from "@indica/ui";
import {
  authApi,
  partnerApi,
  type PartnerReferral,
  ApiError,
} from "../../../lib/api";

const formatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
});

const statusLabels: Record<
  PartnerReferral["status"],
  { label: string; variant: "success" | "warning" | "default" | "destructive" }
> = {
  closed: { label: "Fechado", variant: "success" },
  in_progress: { label: "Em atendimento", variant: "warning" },
  qualified: { label: "Qualificado", variant: "default" },
  new: { label: "Novo", variant: "default" },
  lost: { label: "Não fechou", variant: "destructive" },
};

const rewardStatusLabels: Record<string, string> = {
  pending: "comissão pendente",
  approved: "comissão aprovada",
  paid: "comissão paga",
  rejected: "comissão rejeitada",
  cancelled: "comissão cancelada",
};

export default function PartnerIndicacoesPage() {
  const router = useRouter();
  const [items, setItems] = useState<PartnerReferral[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    partnerApi
      .referrals()
      .then((d) => setItems(d || []))
      .catch((e: ApiError) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await authApi.logout();
    } catch {}
    router.push("/login");
  }

  const filtered = items.filter(
    (r) => statusFilter === "all" || r.status === statusFilter,
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
        Minhas indicações
      </h1>

      <div className="flex gap-3">
        <select
          className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">Status: Todos</option>
          <option value="new">Novo</option>
          <option value="in_progress">Em atendimento</option>
          <option value="qualified">Qualificado</option>
          <option value="closed">Fechado</option>
          <option value="lost">Não fechou</option>
        </select>
      </div>

      {loading && (
        <p className="text-sm text-neutral-500">Carregando...</p>
      )}
      {error &&
        (error.toLowerCase().includes("partner not found") ? (
          <div className="mx-auto max-w-md space-y-4 rounded-lg border border-neutral-200 bg-white p-6 text-center dark:border-neutral-800 dark:bg-neutral-900">
            <h2 className="text-lg font-semibold">
              Esta conta não é de parceiro
            </h2>
            <p className="text-sm text-neutral-500">
              Saia e entre com o e-mail do parceiro pra ver as indicações.
            </p>
            <Button
              className="w-full"
              disabled={loggingOut}
              onClick={handleLogout}
            >
              {loggingOut ? "Saindo..." : "Sair e entrar como parceiro"}
            </Button>
          </div>
        ) : (
          <div className="rounded-lg border border-error/30 bg-error/5 p-4 text-sm text-error">
            {error}
          </div>
        ))}

      <div className="space-y-3">
        {filtered.map((ref) => (
          <div
            key={ref.lead_id}
            className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium">{ref.lead_name || "—"}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <Badge variant={statusLabels[ref.status].variant}>
                    {statusLabels[ref.status].label}
                  </Badge>
                  {ref.sale_amount_cents != null && (
                    <span className="text-sm text-neutral-500">
                      Venda: {formatter.format(ref.sale_amount_cents / 100)}
                    </span>
                  )}
                </div>
                {ref.reward_cents != null && ref.reward_status && (
                  <p className="mt-1 text-sm text-success">
                    {formatter.format(ref.reward_cents / 100)} —{" "}
                    {rewardStatusLabels[ref.reward_status] || ref.reward_status}
                  </p>
                )}
                <p className="mt-1 text-xs text-neutral-400">
                  Cadastrada: {dateFormatter.format(new Date(ref.created_at))}
                </p>
              </div>
            </div>
          </div>
        ))}
        {!loading && filtered.length === 0 && (
          <div className="rounded-lg border border-dashed border-neutral-300 bg-white p-8 text-center dark:border-neutral-700 dark:bg-neutral-900">
            <p className="text-neutral-500">
              {items.length === 0
                ? "Você ainda não tem indicações."
                : "Nenhuma indicação com este filtro."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
