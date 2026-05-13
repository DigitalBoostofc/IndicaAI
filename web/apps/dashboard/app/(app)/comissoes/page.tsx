"use client";

import { useEffect, useState } from "react";
import { Search, MoreHorizontal, Check, X } from "lucide-react";
import {
  StatCard,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  toast,
} from "@indica/ui";
import {
  rewardsApi,
  type Reward,
  type RewardStatus,
  type RewardSummary,
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

const statusLabels: Record<
  RewardStatus,
  { label: string; variant: "warning" | "success" | "destructive" | "default" }
> = {
  pending: { label: "Pendente", variant: "warning" },
  approved: { label: "Aprovada", variant: "success" },
  paid: { label: "Paga", variant: "success" },
  rejected: { label: "Rejeitada", variant: "destructive" },
  cancelled: { label: "Cancelada", variant: "destructive" },
};

export default function ComissoesPage() {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [summary, setSummary] = useState<RewardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  function reload() {
    setLoading(true);
    Promise.all([rewardsApi.list(), rewardsApi.summary()])
      .then(([list, sum]) => {
        setRewards(list || []);
        setSummary(sum);
      })
      .catch((e: ApiError) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    reload();
  }, []);

  async function handleApprove(id: string) {
    setBusy(id);
    try {
      await rewardsApi.approve(id);
      toast({ title: "Comissão aprovada", variant: "success" });
      reload();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Erro inesperado";
      toast({ title: "Falha ao aprovar", description: msg, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  }

  async function handleReject(id: string) {
    const reason = window.prompt("Motivo da rejeição:");
    if (!reason) return;
    setBusy(id);
    try {
      await rewardsApi.reject(id, reason);
      toast({ title: "Comissão rejeitada", variant: "warning" });
      reload();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Erro inesperado";
      toast({ title: "Falha ao rejeitar", description: msg, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  }

  const filtered = rewards.filter((r) => {
    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    const haystack = [r.partner_name, r.lead_name, r.program_name]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const matchesSearch = haystack.includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
          Comissões
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Aprove ou rejeite recompensas pendentes e acompanhe o que já foi pago.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Pendente"
          value={formatter.format((summary?.pending || 0) / 100)}
        />
        <StatCard
          label="Aprovada"
          value={formatter.format((summary?.approved || 0) / 100)}
        />
        <StatCard
          label="Paga"
          value={formatter.format((summary?.paid || 0) / 100)}
        />
        <StatCard
          label="Rejeitada"
          value={formatter.format(
            ((summary?.rejected || 0) + (summary?.cancelled || 0)) / 100,
          )}
        />
      </div>

      {error && (
        <div className="rounded-lg border border-error/30 bg-error/5 p-4 text-sm text-error">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex flex-wrap items-center gap-3 border-b border-neutral-200 p-4 dark:border-neutral-800">
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Buscar por parceiro, indicação ou programa..."
              className="w-full rounded-full border border-neutral-200 bg-neutral-50 py-2 pl-9 pr-4 text-sm transition-colors focus:border-primary focus:bg-white focus:outline-none dark:border-neutral-700 dark:bg-neutral-800"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Todos os status</option>
            <option value="pending">Pendente</option>
            <option value="approved">Aprovada</option>
            <option value="paid">Paga</option>
            <option value="rejected">Rejeitada</option>
            <option value="cancelled">Cancelada</option>
          </select>
        </div>

        {loading ? (
          <p className="px-4 py-8 text-center text-sm text-neutral-500">
            Carregando comissões...
          </p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Parceiro</TableHead>
                  <TableHead>Indicação</TableHead>
                  <TableHead>Programa</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="w-12 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id} className="hover:bg-neutral-50/60 dark:hover:bg-neutral-800/50">
                    <TableCell className="font-medium text-neutral-900 dark:text-neutral-50">
                      {r.partner_name}
                    </TableCell>
                    <TableCell className="text-neutral-500">
                      {r.lead_name || "—"}
                    </TableCell>
                    <TableCell className="text-neutral-500">
                      {r.program_name}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatter.format(r.amount_cents / 100)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusLabels[r.status].variant}>
                        {statusLabels[r.status].label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-neutral-500">
                      {dateFormatter.format(new Date(r.created_at))}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={busy === r.id}
                            aria-label="Ações"
                            className="h-8 w-8 p-0"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {r.status === "pending" ? (
                            <>
                              <DropdownMenuItem
                                onSelect={() => handleApprove(r.id)}
                              >
                                <Check className="mr-2 h-3.5 w-3.5 text-success" />
                                Aprovar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onSelect={() => handleReject(r.id)}
                              >
                                <X className="mr-2 h-3.5 w-3.5 text-error" />
                                Rejeitar
                              </DropdownMenuItem>
                            </>
                          ) : (
                            <DropdownMenuItem disabled>
                              Sem ações disponíveis
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-neutral-500">
                      {rewards.length === 0
                        ? "Nenhuma comissão ainda."
                        : "Nenhuma comissão com este filtro."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            <div className="flex items-center justify-end border-t border-neutral-200 px-4 py-3 dark:border-neutral-800">
              <p className="text-sm text-neutral-500">
                {filtered.length} {filtered.length === 1 ? "comissão" : "comissões"}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
