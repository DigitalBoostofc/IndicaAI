"use client";

import { Sheet, SheetContent, LeadStatusBadge, Button, toast } from "@indica/ui";
import type { MockReferral } from "@indica/api-client/mocks";

interface IndicacaoSheetProps {
  indicacao: MockReferral;
  onClose: () => void;
}

const origemLabel: Record<string, string> = {
  whatsapp: "WhatsApp",
  site: "Site",
  manual: "Manual",
};

export function IndicacaoSheet({ indicacao, onClose }: IndicacaoSheetProps) {
  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:w-[480px]">
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="border-b border-neutral-200 pb-4 dark:border-neutral-800">
            <h2 className="text-lg font-semibold">
              Indicação: {indicacao.nome}
            </h2>
            <div className="mt-2 flex items-center gap-3 text-sm text-neutral-500">
              <LeadStatusBadge status={indicacao.status} />
              <span>Parceiro: {indicacao.parceiro}</span>
            </div>
            <div className="mt-2 space-y-1 text-sm text-neutral-500">
              <p>Telefone: {indicacao.telefone}</p>
              <p>Programa: {indicacao.programa}</p>
              <p>Origem: {origemLabel[indicacao.origem]}</p>
              <p>Data: {new Date(indicacao.data).toLocaleDateString("pt-BR")}</p>
            </div>
            {indicacao.valorPotencial > 0 && (
              <p className="mt-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Valor potencial:{" "}
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(indicacao.valorPotencial)}
              </p>
            )}
          </div>

          {/* Timeline */}
          <div className="flex-1 overflow-y-auto py-4">
            <h3 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
              Timeline
            </h3>
            <div className="space-y-4">
              {indicacao.status === "closed" && (
                <TimelineItem
                  date={`${indicacao.data} 14:30`}
                  title={`Venda confirmada — ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(indicacao.valorPotencial)}`}
                  detail="Comissão: aprovada"
                />
              )}
              {indicacao.status === "qualified" && (
                <TimelineItem
                  date={`${indicacao.data} 11:00`}
                  title="Lead qualificado"
                  detail="Interesse confirmado pelo atendente"
                />
              )}
              {(indicacao.status === "contacted" || indicacao.status === "qualified" || indicacao.status === "closed") && (
                <TimelineItem
                  date={`${indicacao.data} 09:15`}
                  title="Em atendimento"
                  detail="Atendimento iniciado"
                />
              )}
              <TimelineItem
                date={`${indicacao.data} 16:42`}
                title="Novo lead cadastrado"
                detail={`Via ${origemLabel[indicacao.origem]} de ${indicacao.parceiro}`}
              />
              <TimelineItem
                date={`${indicacao.data} 16:40`}
                title="Clique registrado"
                detail="IP: 189.x.x.x · Dispositivo: iPhone"
              />
            </div>
          </div>

          {/* Ações */}
          <div className="space-y-3 border-t border-neutral-200 pt-4 dark:border-neutral-800">
            <div>
              <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Alterar status
              </label>
              <select
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
                defaultValue={indicacao.status}
              >
                <option value="new">Novo</option>
                <option value="contacted">Em atendimento</option>
                <option value="qualified">Qualificado</option>
                <option value="closed">Fechado</option>
                <option value="lost">Não fechou</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Notas
              </label>
              <textarea
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
                rows={2}
                placeholder="Adicione uma nota..."
              />
            </div>
            <Button
              className="w-full"
              onClick={() =>
                toast({
                  title: "Indicação atualizada",
                  description: "Status e notas foram salvos.",
                  variant: "success",
                })
              }
            >
              Salvar
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function TimelineItem({
  date,
  title,
  detail,
}: {
  date: string;
  title: string;
  detail?: string;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className="h-3 w-3 rounded-full bg-primary" />
        <div className="w-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
      </div>
      <div className="pb-4">
        <p className="text-xs text-neutral-500">{date}</p>
        <p className="text-sm font-medium">{title}</p>
        {detail && <p className="text-xs text-neutral-500">{detail}</p>}
      </div>
    </div>
  );
}
