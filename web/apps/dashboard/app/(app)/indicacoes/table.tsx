"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, LeadStatusBadge, Button, toast } from "@indica/ui";
import { mockReferrals, type MockReferral } from "@indica/api-client/mocks";
import { IndicacaoSheet } from "./sheet";

const formatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function IndicacoesTable() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = mockReferrals.filter((item) => {
    const matchesSearch =
      item.nome.toLowerCase().includes(search.toLowerCase()) ||
      item.telefone.includes(search) ||
      item.parceiro.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <>
      <div className="rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-3 border-b border-neutral-200 p-4 dark:border-neutral-800">
          <input
            type="text"
            placeholder="Buscar por nome, telefone ou parceiro..."
            className="w-full max-w-xs rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Status: Todos</option>
            <option value="new">Novo</option>
            <option value="contacted">Em atendimento</option>
            <option value="qualified">Qualificado</option>
            <option value="closed">Fechado</option>
            <option value="lost">Não fechou</option>
          </select>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Parceiro</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Valor potencial</TableHead>
              <TableHead>Data</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((item) => (
              <TableRow
                key={item.id}
                className="cursor-pointer"
                onClick={() => setSelectedId(item.id)}
              >
                <TableCell className="font-medium">{item.nome}</TableCell>
                <TableCell className="text-neutral-500">{item.telefone}</TableCell>
                <TableCell className="text-neutral-500">{item.parceiro}</TableCell>
                <TableCell>
                  <LeadStatusBadge status={item.status} />
                </TableCell>
                <TableCell className="text-right">
                  {item.valorPotencial > 0 ? formatter.format(item.valorPotencial) : "—"}
                </TableCell>
                <TableCell className="text-neutral-500">
                  {new Date(item.data).toLocaleDateString("pt-BR")}
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-neutral-500">
                  Nenhuma indicação encontrada com os filtros aplicados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Paginação */}
        <div className="flex items-center justify-between border-t border-neutral-200 px-4 py-3 dark:border-neutral-800">
          <p className="text-sm text-neutral-500">Mostrando 1-{filtered.length} de {filtered.length}</p>
        </div>
      </div>

      {/* Ações em lote */}
      <div className="flex gap-3">
        <Button
          variant="default"
          size="sm"
          onClick={() =>
            toast({
              title: "Indicações aprovadas",
              description: "3 indicações selecionadas foram aprovadas.",
              variant: "success",
            })
          }
        >
          Aprovar selecionados
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            toast({
              title: "Exportação iniciada",
              description: "O arquivo CSV será baixado em instantes.",
              variant: "default",
            })
          }
        >
          Exportar CSV
        </Button>
      </div>

      {/* Sheet lateral com timeline */}
      {selectedId && (
        <IndicacaoSheet
          indicacao={mockReferrals.find((i) => i.id === selectedId)!}
          onClose={() => setSelectedId(null)}
        />
      )}
    </>
  );
}
