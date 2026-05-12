// Wireframe §2.4 — Lista de Indicações do Parceiro
// Cards com status, valor, timeline expansível

"use client";

import { useState } from "react";
import { Badge, Button } from "@indica/ui";

const mockReferrals = [
  { id: "1", nome: "Maria Silva", status: "closed" as const, valor: "R$1.000", comissao: "R$100,00 (aprovada)", data: "09/05" },
  { id: "2", nome: "José Souza", status: "contacted" as const, valor: "—", comissao: "—", data: "11/05" },
  { id: "3", nome: "Ana Costa", status: "new" as const, valor: "—", comissao: "—", data: "11/05" },
];

const statusLabels: Record<string, { label: string; variant: "success" | "warning" | "info" | "default" }> = {
  closed: { label: "Fechado", variant: "success" },
  contacted: { label: "Em atendimento", variant: "warning" },
  new: { label: "Novo", variant: "info" },
};

export default function IndicacoesPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
        Minhas indicações
      </h1>

      {/* Filtros */}
      <div className="flex gap-3">
        <select className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900">
          <option>Status: Todos</option>
          <option>Novo</option>
          <option>Em atendimento</option>
          <option>Fechado</option>
        </select>
        <select className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900">
          <option>Período: 30 dias</option>
          <option>7 dias</option>
          <option>90 dias</option>
        </select>
      </div>

      {/* Lista de cards */}
      <div className="space-y-3">
        {mockReferrals.map((ref) => (
          <div
            key={ref.id}
            className="rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"
          >
            <div className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">{ref.nome}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant={statusLabels[ref.status].variant}>
                      {statusLabels[ref.status].label}
                    </Badge>
                    {ref.valor !== "—" && (
                      <span className="text-sm text-neutral-500">Valor: {ref.valor}</span>
                    )}
                  </div>
                  {ref.comissao !== "—" && (
                    <p className="mt-1 text-sm text-success">{ref.comissao}</p>
                  )}
                  <p className="text-xs text-neutral-400">Cadastrada: {ref.data}</p>
                </div>
              </div>

              <button
                className="mt-3 text-sm font-medium text-primary hover:underline"
                onClick={() => setExpandedId(expandedId === ref.id ? null : ref.id)}
              >
                {expandedId === ref.id ? "▲ Ocultar timeline" : "▸ Ver timeline"}
              </button>
            </div>

            {/* Timeline expansível */}
            {expandedId === ref.id && (
              <div className="border-t border-neutral-200 px-4 py-3 dark:border-neutral-800">
                <div className="space-y-3">
                  {ref.status === "closed" && (
                    <TimelineItem date="12/05 14:30" title="Venda confirmada" detail="R$1.000,00 → comissão R$100,00" />
                  )}
                  {ref.status !== "new" && (
                    <TimelineItem date="10/05 09:15" title="Em atendimento" detail="Atendente: Dra. Patricia" />
                  )}
                  <TimelineItem date={`${ref.data} 16:42`} title="Indicação cadastrada" detail="Por: você (manual)" />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <Button variant="outline" className="w-full">
        Carregar mais
      </Button>
    </div>
  );
}

function TimelineItem({ date, title, detail }: { date: string; title: string; detail?: string }) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className="h-3 w-3 rounded-full bg-primary" />
        <div className="w-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
      </div>
      <div>
        <p className="text-xs text-neutral-500">{date}</p>
        <p className="text-sm font-medium">{title}</p>
        {detail && <p className="text-xs text-neutral-500">{detail}</p>}
      </div>
    </div>
  );
}
