"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, MoreHorizontal, Check, Banknote, X, Plus } from "lucide-react";
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
  payoutsApi,
  type Payout,
  type PayoutStatus,
  ApiError,
} from "../../lib/api";

const formatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const statusLabels: Record<
  PayoutStatus,
  { label: string; variant: "warning" | "success" | "destructive" | "default" }
> = {
  pending: { label: "Pendente", variant: "warning" },
  processing: { label: "Confirmado", variant: "warning" },
  paid: { label: "Pago", variant: "success" },
  failed: { label: "Falhou", variant: "destructive" },
  cancelled: { label: "Cancelado", variant: "destructive" },
};

// /saques is the tenant-admin view for manual payout management. The MVP
// settles repayments off-platform (Pix on the bank's app); this screen is
// the system-of-record that tracks each transition.
export default function SaquesPage() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  function reload() {
    setLoading(true);
    payoutsApi
      .list({ limit: 100 })
      .then((res) => setPayouts(res.payouts || []))
      .catch((e: ApiError) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    reload();
  }, []);

  async function handleCreateJob() {
    setBusy("__create__");
    try {
      const res = await payoutsApi.createJob();
      toast({
        title: res.created > 0 ? `${res.created} saque(s) criado(s)` : "Nenhum saque elegível",
        description:
          res.created > 0
            ? "Comissões aprovadas dentro da janela de hold foram agrupadas."
            : "Sem comissões aprovadas além do prazo de hold neste momento.",
        variant: "success",
      });
      reload();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Erro inesperado";
      toast({ title: "Falha ao criar saques", description: msg, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  }

  async function handleConfirm(id: string) {
    setBusy(id);
    try {
      await payoutsApi.confirm(id);
      toast({ title: "Saque confirmado", description: "Agora é só efetuar o Pix.", variant: "success" });
      reload();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Erro inesperado";
      toast({ title: "Falha ao confirmar", description: msg, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  }

  async function handleMarkPaid(id: string) {
    const receiptURL = window.prompt(
      "Cole a URL do comprovante (opcional):",
      "",
    );
    setBusy(id);
    try {
      await payoutsApi.paid(id, receiptURL ? { receipt_url: receiptURL } : undefined);
      toast({ title: "Saque marcado como pago", variant: "success" });
      reload();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Erro inesperado";
      toast({ title: "Falha ao marcar como pago", description: msg, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  }

  async function handleCancel(id: string) {
    const reason = window.prompt("Motivo do cancelamento (opcional):", "");
    if (reason === null) return; // user clicked Cancel
    setBusy(id);
    try {
      await payoutsApi.cancel(id, reason || undefined);
      toast({ title: "Saque cancelado", variant: "warning" });
      reload();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Erro inesperado";
      toast({ title: "Falha ao cancelar", description: msg, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  }

  const totals = useMemo(() => {
    const acc = { pending: 0, processing: 0, paid: 0, cancelled: 0 };
    for (const p of payouts) {
      if (p.status === "pending") acc.pending += p.amount_cents;
      if (p.status === "processing") acc.processing += p.amount_cents;
      if (p.status === "paid") acc.paid += p.amount_cents;
      if (p.status === "cancelled" || p.status === "failed") acc.cancelled += p.amount_cents;
    }
    return acc;
  }, [payouts]);

  const filtered = payouts.filter((p) => {
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    const haystack = (p.partner_name || "").toLowerCase();
    return matchesStatus && haystack.includes(search.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
            Saques
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Agrupe comissões aprovadas em saques, confirme e marque como pago após
            o Pix manual.
          </p>
        </div>
        <Button
          onClick={handleCreateJob}
          disabled={busy === "__create__"}
          className="shrink-0"
        >
          <Plus className="mr-2 h-4 w-4" />
          Gerar saques
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Pendente"
          value={formatter.format(totals.pending / 100)}
        />
        <StatCard
          label="Confirmado"
          value={formatter.format(totals.processing / 100)}
        />
        <StatCard
          label="Pago"
          value={formatter.format(totals.paid / 100)}
        />
        <StatCard
          label="Cancelado"
          value={formatter.format(totals.cancelled / 100)}
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
              placeholder="Buscar por parceiro..."
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
            <option value="processing">Confirmado</option>
            <option value="paid">Pago</option>
            <option value="cancelled">Cancelado</option>
            <option value="failed">Falhou</option>
          </select>
        </div>

        {loading ? (
          <p className="px-4 py-8 text-center text-sm text-neutral-500">
            Carregando saques...
          </p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Parceiro</TableHead>
                  <TableHead>Chave Pix</TableHead>
                  <TableHead className="text-right">Comissões</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="w-12 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => (
                  <TableRow
                    key={p.id}
                    className="hover:bg-neutral-50/60 dark:hover:bg-neutral-800/50"
                  >
                    <TableCell className="font-medium text-neutral-900 dark:text-neutral-50">
                      {p.partner_name}
                    </TableCell>
                    <TableCell className="text-neutral-500">
                      {p.pix_key ? (
                        <span className="font-mono text-xs">
                          {p.pix_key}
                          {p.pix_key_type && (
                            <span className="ml-1 text-neutral-400">({p.pix_key_type})</span>
                          )}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-right text-neutral-500">
                      {p.reward_count ?? "—"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatter.format(p.amount_cents / 100)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusLabels[p.status].variant}>
                        {statusLabels[p.status].label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-neutral-500">
                      {dateFormatter.format(new Date(p.created_at))}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={busy === p.id}
                            aria-label="Ações"
                            className="h-8 w-8 p-0"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {p.status === "pending" && (
                            <>
                              <DropdownMenuItem onSelect={() => handleConfirm(p.id)}>
                                <Check className="mr-2 h-3.5 w-3.5 text-success" />
                                Confirmar
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => handleCancel(p.id)}>
                                <X className="mr-2 h-3.5 w-3.5 text-error" />
                                Cancelar
                              </DropdownMenuItem>
                            </>
                          )}
                          {p.status === "processing" && (
                            <>
                              <DropdownMenuItem onSelect={() => handleMarkPaid(p.id)}>
                                <Banknote className="mr-2 h-3.5 w-3.5 text-success" />
                                Marcar como pago
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => handleCancel(p.id)}>
                                <X className="mr-2 h-3.5 w-3.5 text-error" />
                                Cancelar
                              </DropdownMenuItem>
                            </>
                          )}
                          {p.status !== "pending" && p.status !== "processing" && (
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
                    <TableCell
                      colSpan={7}
                      className="py-10 text-center text-neutral-500"
                    >
                      {payouts.length === 0
                        ? "Nenhum saque ainda. Use \"Gerar saques\" para agrupar comissões aprovadas."
                        : "Nenhum saque com este filtro."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            <div className="flex items-center justify-end border-t border-neutral-200 px-4 py-3 dark:border-neutral-800">
              <p className="text-sm text-neutral-500">
                {filtered.length} {filtered.length === 1 ? "saque" : "saques"}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
