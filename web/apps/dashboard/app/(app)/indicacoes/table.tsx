"use client";

import { useEffect, useState } from "react";
import { Search, MoreHorizontal, Check } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  LeadStatusBadge,
  Button,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  toast,
} from "@indica/ui";
import { leadsApi, type Lead, type LeadStatus, ApiError } from "../../lib/api";
import { IndicacaoSheet } from "./sheet";

const formatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const sourceLabels: Record<string, string> = {
  referral: "Link",
  manual: "Manual",
  whatsapp: "WhatsApp",
  widget: "Widget",
  import: "Importação",
};

const statusActions: { value: LeadStatus; label: string }[] = [
  { value: "new", label: "Novo" },
  { value: "in_progress", label: "Em atendimento" },
  { value: "qualified", label: "Qualificado" },
  { value: "closed", label: "Fechado" },
  { value: "lost", label: "Não fechou" },
];

export function IndicacoesTable() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Lead | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  function reload() {
    setLoading(true);
    leadsApi
      .list()
      .then((data) => setLeads(data || []))
      .catch((e: ApiError) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    reload();
  }, []);

  async function handleStatusChange(lead: Lead, next: LeadStatus) {
    if (lead.status === next) return;
    setUpdatingId(lead.id);
    try {
      await leadsApi.updateStatus(lead.id, next);
      toast({
        title: "Status atualizado",
        description: `${lead.name || "Indicação"} → ${statusActions.find((s) => s.value === next)?.label}`,
        variant: "success",
      });
      reload();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Erro inesperado";
      toast({
        title: "Não foi possível atualizar",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setUpdatingId(null);
    }
  }

  const filtered = leads.filter((l) => {
    const haystack = [l.name, l.email, l.phone_e164, l.partner_name]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const matchesSearch = haystack.includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || l.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return <p className="text-sm text-neutral-500">Carregando indicações...</p>;
  }
  if (error) {
    return (
      <div className="rounded-lg border border-error/30 bg-error/5 p-4 text-sm text-error">
        {error}
      </div>
    );
  }

  return (
    <>
      <div className="rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex flex-wrap items-center gap-3 border-b border-neutral-200 p-4 dark:border-neutral-800">
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Buscar por nome, telefone, email ou parceiro..."
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
            {statusActions.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Parceiro</TableHead>
              <TableHead>Programa</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="w-12 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((lead) => (
              <TableRow
                key={lead.id}
                className="cursor-pointer hover:bg-neutral-50/60 dark:hover:bg-neutral-800/50"
                onClick={() => setSelected(lead)}
              >
                <TableCell>
                  <div className="font-medium text-neutral-900 dark:text-neutral-50">
                    {lead.name || "—"}
                  </div>
                  {(lead.email || lead.phone_e164) && (
                    <div className="text-xs text-neutral-500">
                      {lead.email || lead.phone_e164}
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-neutral-600 dark:text-neutral-300">
                  {lead.partner_name || "—"}
                </TableCell>
                <TableCell className="text-neutral-500">
                  {lead.program_name}
                </TableCell>
                <TableCell className="text-neutral-500">
                  {sourceLabels[lead.source] || lead.source}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {lead.sale_amount_cents
                    ? formatter.format(lead.sale_amount_cents / 100)
                    : "—"}
                </TableCell>
                <TableCell>
                  <LeadStatusBadge status={lead.status as LeadStatus} />
                </TableCell>
                <TableCell className="text-neutral-500">
                  {new Date(lead.created_at).toLocaleDateString("pt-BR")}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={updatingId === lead.id}
                        onClick={(e) => e.stopPropagation()}
                        aria-label="Ações"
                        className="h-8 w-8 p-0"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {statusActions.map((s) => (
                        <DropdownMenuItem
                          key={s.value}
                          onSelect={() => handleStatusChange(lead, s.value)}
                        >
                          <span className="flex-1">{s.label}</span>
                          {lead.status === s.value && (
                            <Check className="ml-2 h-3.5 w-3.5" />
                          )}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-neutral-500">
                  {leads.length === 0
                    ? "Nenhuma indicação ainda."
                    : "Nenhuma indicação encontrada com os filtros aplicados."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <div className="flex items-center justify-end border-t border-neutral-200 px-4 py-3 dark:border-neutral-800">
          <p className="text-sm text-neutral-500">
            {filtered.length} {filtered.length === 1 ? "indicação" : "indicações"}
          </p>
        </div>
      </div>

      {selected && (
        <IndicacaoSheet
          indicacao={selected}
          onClose={() => setSelected(null)}
          onUpdated={() => {
            reload();
            setSelected(null);
          }}
        />
      )}
    </>
  );
}
