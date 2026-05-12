"use client";

import { useState } from "react";
import { StatCard, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Badge, Button, toast } from "@indica/ui";

const formatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const mockComissoes = [
  { id: "1", parceiro: "Karine Silva", indicacao: "Maria Silva", valor: 100, status: "pending" as const },
  { id: "2", parceiro: "Pedro Lima", indicacao: "José Souza", valor: 150, status: "pending" as const },
  { id: "3", parceiro: "Karine Silva", indicacao: "Juliana Alves", valor: 100, status: "approved" as const },
  { id: "4", parceiro: "Ana Costa", indicacao: "Rafael Pereira", valor: 80, status: "paid" as const },
  { id: "5", parceiro: "Pedro Lima", indicacao: "Lucia Ferreira", valor: 120, status: "cancelled" as const },
  { id: "6", parceiro: "Juliana Costa", indicacao: "Leonardo Oliveira", valor: 200, status: "paid" as const },
  { id: "7", parceiro: "Roberto Almeida", indicacao: "Patricia Gomes", valor: 100, status: "approved" as const },
  { id: "8", parceiro: "Fernanda Santos", indicacao: "Marcos Santos", valor: 75, status: "pending" as const },
];

const statusLabels: Record<string, { label: string; variant: "warning" | "success" | "destructive" | "default" }> = {
  pending: { label: "Pendente", variant: "warning" },
  approved: { label: "Aprovada", variant: "success" },
  paid: { label: "Paga", variant: "success" },
  cancelled: { label: "Cancelada", variant: "destructive" },
};

export default function ComissoesPage() {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === mockComissoes.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(mockComissoes.map((c) => c.id)));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
          Comissões
        </h1>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <select className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900">
          <option>Status: Todos</option>
          <option>Pendente</option>
          <option>Aprovada</option>
          <option>Paga</option>
          <option>Cancelada</option>
        </select>
        <select className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900">
          <option>Período: 30 dias</option>
          <option>7 dias</option>
          <option>90 dias</option>
        </select>
        <select className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900">
          <option>Programa: Todos</option>
        </select>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Pendente" value={formatter.format(325)} />
        <StatCard label="Aprovada" value={formatter.format(300)} />
        <StatCard label="Pagas" value={formatter.format(280)} />
        <StatCard label="Canceladas" value={formatter.format(120)} />
      </div>

      {/* Tabela */}
      <div className="rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <input
                  type="checkbox"
                  className="rounded border-neutral-300"
                  aria-label="Selecionar todos"
                  checked={selected.size === mockComissoes.length}
                  onChange={toggleAll}
                />
              </TableHead>
              <TableHead>Parceiro</TableHead>
              <TableHead>Indicação</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockComissoes.map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  <input
                    type="checkbox"
                    className="rounded border-neutral-300"
                    aria-label={`Selecionar ${c.parceiro}`}
                    checked={selected.has(c.id)}
                    onChange={() => toggleSelect(c.id)}
                  />
                </TableCell>
                <TableCell className="font-medium">{c.parceiro}</TableCell>
                <TableCell className="text-neutral-500">{c.indicacao}</TableCell>
                <TableCell className="text-right">{formatter.format(c.valor)}</TableCell>
                <TableCell>
                  <Badge variant={statusLabels[c.status].variant}>
                    {statusLabels[c.status].label}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {c.status === "pending" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        toast({
                          title: "Comissão aprovada",
                          description: `Comissão de ${c.parceiro} (${formatter.format(c.valor)}) aprovada.`,
                          variant: "success",
                        })
                      }
                    >
                      Aprovar
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Paginação + ações em lote */}
        <div className="flex items-center justify-between border-t border-neutral-200 px-4 py-3 dark:border-neutral-800">
          <div className="flex gap-3">
            <Button
              variant="default"
              size="sm"
              onClick={() =>
                toast({
                  title: "Comissões aprovadas",
                  description: `${selected.size} comissões selecionadas foram aprovadas.`,
                  variant: "success",
                })
              }
            >
              Aprovar selecionados
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() =>
                toast({
                  title: "Comissões rejeitadas",
                  description: `${selected.size} comissões selecionadas foram rejeitadas.`,
                  variant: "warning",
                })
              }
            >
              Rejeitar selecionados
            </Button>
          </div>
          <p className="text-sm text-neutral-500">Mostrando 1-{mockComissoes.length} de {mockComissoes.length}</p>
        </div>
      </div>
    </div>
  );
}
