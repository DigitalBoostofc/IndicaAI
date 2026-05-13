"use client";

import { useEffect, useState } from "react";
import { Search, MoreHorizontal, Copy, Eye } from "lucide-react";
import {
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
import { partnersApi, type Partner, ApiError } from "../../lib/api";
import { ParceiroSheet } from "./sheet";

const formatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const statusVariant: Record<Partner["status"], "success" | "warning" | "destructive"> = {
  active: "success",
  pending: "warning",
  suspended: "destructive",
};

const statusLabel: Record<string, string> = {
  active: "Ativo",
  pending: "Pendente",
  suspended: "Suspenso",
};

export function ParceirosTable() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Partner | null>(null);
  const [search, setSearch] = useState("");
  const [programaFilter, setProgramaFilter] = useState("all");

  useEffect(() => {
    partnersApi
      .list()
      .then((data) => setPartners(data || []))
      .catch((e: ApiError) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const programas = Array.from(new Set(partners.map((p) => p.program_name)));

  const filtered = partners.filter((p) => {
    const haystack = [p.name, p.email, p.phone_e164].filter(Boolean).join(" ").toLowerCase();
    const matchesSearch = haystack.includes(search.toLowerCase());
    const matchesPrograma =
      programaFilter === "all" || p.program_name === programaFilter;
    return matchesSearch && matchesPrograma;
  });

  function copyLink(p: Partner) {
    if (!p.link_url) {
      toast({
        title: "Sem link gerado",
        description: "Esse parceiro ainda não tem link de indicação.",
        variant: "warning",
      });
      return;
    }
    navigator.clipboard.writeText(p.link_url);
    toast({
      title: "Link copiado!",
      description: p.link_url,
      variant: "success",
    });
  }

  if (loading) {
    return <p className="text-sm text-neutral-500">Carregando parceiros...</p>;
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
              placeholder="Buscar por nome, email ou telefone..."
              className="w-full rounded-full border border-neutral-200 bg-neutral-50 py-2 pl-9 pr-4 text-sm transition-colors focus:border-primary focus:bg-white focus:outline-none dark:border-neutral-700 dark:bg-neutral-800"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            value={programaFilter}
            onChange={(e) => setProgramaFilter(e.target.value)}
          >
            <option value="all">Todos os programas</option>
            {programas.map((prog) => (
              <option key={prog} value={prog}>
                {prog}
              </option>
            ))}
          </select>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Parceiro</TableHead>
              <TableHead>Programa</TableHead>
              <TableHead className="text-right">Indic.</TableHead>
              <TableHead className="text-right">Cliques</TableHead>
              <TableHead className="text-right">Comissão</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((p) => (
              <TableRow
                key={p.id}
                className="cursor-pointer hover:bg-neutral-50/60 dark:hover:bg-neutral-800/50"
                onClick={() => setSelected(p)}
              >
                <TableCell>
                  <div className="font-medium text-neutral-900 dark:text-neutral-50">
                    {p.name}
                  </div>
                  {(p.email || p.phone_e164) && (
                    <div className="text-xs text-neutral-500">
                      {p.email || p.phone_e164}
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-neutral-500">{p.program_name}</TableCell>
                <TableCell className="text-right font-medium">
                  {p.referrals}
                </TableCell>
                <TableCell className="text-right">
                  {p.clicks.toLocaleString("pt-BR")}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatter.format(p.commission_cents / 100)}
                </TableCell>
                <TableCell>
                  <Badge variant={statusVariant[p.status]}>
                    {statusLabel[p.status]}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label="Ações"
                        className="h-8 w-8 p-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <DropdownMenuItem
                        onSelect={() => copyLink(p)}
                      >
                        <Copy className="mr-2 h-3.5 w-3.5" /> Copiar link
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => setSelected(p)}>
                        <Eye className="mr-2 h-3.5 w-3.5" /> Ver detalhes
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-neutral-500">
                  {partners.length === 0
                    ? "Nenhum parceiro cadastrado ainda."
                    : "Nenhum parceiro encontrado com os filtros aplicados."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <div className="flex items-center justify-end border-t border-neutral-200 px-4 py-3 dark:border-neutral-800">
          <p className="text-sm text-neutral-500">
            {filtered.length} {filtered.length === 1 ? "parceiro" : "parceiros"}
          </p>
        </div>
      </div>

      {selected && (
        <ParceiroSheet
          parceiro={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
