"use client";

import { useState } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
  Badge, Button, CopyLinkButton, toast,
} from "@indica/ui";
import { mockPartners, type MockPartner } from "@indica/api-client/mocks";
import { ParceiroSheet } from "./sheet";

const formatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const statusVariant: Record<MockPartner["status"], "success" | "warning" | "destructive"> = {
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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [programaFilter, setProgramaFilter] = useState("all");

  const programas = Array.from(new Set(mockPartners.map((p) => p.programa)));

  const filtered = mockPartners.filter((p) => {
    const matchesSearch =
      p.nome.toLowerCase().includes(search.toLowerCase()) ||
      p.email.toLowerCase().includes(search.toLowerCase());
    const matchesPrograma =
      programaFilter === "all" || p.programa === programaFilter;
    return matchesSearch && matchesPrograma;
  });

  return (
    <>
      <div className="rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-3 border-b border-neutral-200 p-4 dark:border-neutral-800">
          <input
            type="text"
            placeholder="Buscar por nome ou e-mail..."
            className="w-full max-w-xs rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            value={programaFilter}
            onChange={(e) => setProgramaFilter(e.target.value)}
          >
            <option value="all">Programa: Todos</option>
            {programas.map((prog) => (
              <option key={prog} value={prog}>{prog}</option>
            ))}
          </select>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Programa</TableHead>
              <TableHead className="text-right">Indic.</TableHead>
              <TableHead className="text-right">Cliques</TableHead>
              <TableHead className="text-right">Comissão</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((p) => (
              <TableRow
                key={p.id}
                className="cursor-pointer"
                onClick={() => setSelectedId(p.id)}
              >
                <TableCell className="font-medium">{p.nome}</TableCell>
                <TableCell className="text-neutral-500">{p.email}</TableCell>
                <TableCell className="text-neutral-500">{p.telefone}</TableCell>
                <TableCell className="text-neutral-500">{p.programa}</TableCell>
                <TableCell className="text-right">{p.indicacoes}</TableCell>
                <TableCell className="text-right">{p.cliques.toLocaleString("pt-BR")}</TableCell>
                <TableCell className="text-right">{formatter.format(p.comissao)}</TableCell>
                <TableCell>
                  <Badge variant={statusVariant[p.status]}>
                    {statusLabel[p.status]}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-neutral-500">
                  Nenhum parceiro encontrado com os filtros aplicados.
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

      {/* Sheet lateral com detalhes do parceiro */}
      {selectedId && (
        <ParceiroSheet
          parceiro={mockPartners.find((p) => p.id === selectedId)!}
          onClose={() => setSelectedId(null)}
        />
      )}
    </>
  );
}
