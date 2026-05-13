"use client";

import { useState } from "react";
import { Sheet, SheetContent, LeadStatusBadge, Button, toast } from "@indica/ui";
import {
  leadsApi,
  type Lead,
  type LeadStatus,
  ApiError,
} from "../../lib/api";

interface IndicacaoSheetProps {
  indicacao: Lead;
  onClose: () => void;
  onUpdated?: () => void;
}

const sourceLabel: Record<string, string> = {
  whatsapp: "WhatsApp",
  referral: "Indicação",
  manual: "Manual",
  widget: "Widget",
  import: "Importação",
};

const formatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function IndicacaoSheet({
  indicacao,
  onClose,
  onUpdated,
}: IndicacaoSheetProps) {
  const [status, setStatus] = useState<LeadStatus>(indicacao.status);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (status === indicacao.status) {
      onClose();
      return;
    }
    setSaving(true);
    try {
      await leadsApi.updateStatus(indicacao.id, status);
      toast({
        title: "Status atualizado",
        description: `Indicação marcada como "${status}"`,
        variant: "success",
      });
      onUpdated?.();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Erro inesperado";
      toast({
        title: "Não foi possível atualizar",
        description: msg,
        variant: "destructive",
      });
      setSaving(false);
    }
  }

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:w-[480px]">
        <div className="flex h-full flex-col">
          <div className="border-b border-neutral-200 pb-4 dark:border-neutral-800">
            <h2 className="text-lg font-semibold">
              Indicação: {indicacao.name || "—"}
            </h2>
            <div className="mt-2 flex items-center gap-3 text-sm text-neutral-500">
              <LeadStatusBadge status={indicacao.status} />
              <span>Parceiro: {indicacao.partner_name || "—"}</span>
            </div>
            <div className="mt-2 space-y-1 text-sm text-neutral-500">
              <p>Telefone: {indicacao.phone_e164 || "—"}</p>
              <p>E-mail: {indicacao.email || "—"}</p>
              <p>Programa: {indicacao.program_name}</p>
              <p>Origem: {sourceLabel[indicacao.source] || indicacao.source}</p>
              <p>
                Data: {dateTimeFormatter.format(new Date(indicacao.created_at))}
              </p>
              {indicacao.closed_at && (
                <p>
                  Fechado em:{" "}
                  {dateTimeFormatter.format(new Date(indicacao.closed_at))}
                </p>
              )}
            </div>
            {indicacao.sale_amount_cents != null && (
              <p className="mt-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Valor da venda: {formatter.format(indicacao.sale_amount_cents / 100)}
              </p>
            )}
            {indicacao.notes && (
              <p className="mt-2 text-sm text-neutral-700 dark:text-neutral-300">
                Notas: {indicacao.notes}
              </p>
            )}
          </div>

          <div className="mt-auto space-y-3 border-t border-neutral-200 pt-4 dark:border-neutral-800">
            <div>
              <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Alterar status
              </label>
              <select
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
                value={status}
                onChange={(e) => setStatus(e.target.value as LeadStatus)}
              >
                <option value="new">Novo</option>
                <option value="in_progress">Em atendimento</option>
                <option value="qualified">Qualificado</option>
                <option value="closed">Fechado</option>
                <option value="lost">Não fechou</option>
              </select>
            </div>
            <Button
              className="w-full"
              disabled={saving}
              onClick={handleSave}
            >
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
