"use client";

import {
  Sheet,
  SheetContent,
  Badge,
  Button,
  CopyLinkButton,
  toast,
} from "@indica/ui";
import type { Partner } from "../../lib/api";

interface ParceiroSheetProps {
  parceiro: Partner;
  onClose: () => void;
}

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

export function ParceiroSheet({ parceiro, onClose }: ParceiroSheetProps) {
  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:w-[480px]">
        <div className="flex h-full flex-col">
          <div className="border-b border-neutral-200 pb-4 dark:border-neutral-800">
            <h2 className="text-lg font-semibold">Parceiro: {parceiro.name}</h2>
            <div className="mt-2 flex items-center gap-3 text-sm text-neutral-500">
              <span>Programa: {parceiro.program_name}</span>
              <Badge variant={statusVariant[parceiro.status]}>
                {statusLabel[parceiro.status]}
              </Badge>
            </div>
            <div className="mt-2 space-y-1 text-sm text-neutral-500">
              <p>E-mail: {parceiro.email || "—"}</p>
              <p>Telefone: {parceiro.phone_e164 || "—"}</p>
              <p>
                Cadastrado em:{" "}
                {new Date(parceiro.created_at).toLocaleDateString("pt-BR")}
              </p>
            </div>
          </div>

          {parceiro.link_url && (
            <div className="py-4">
              <h3 className="mb-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                Link de indicação
              </h3>
              <CopyLinkButton url={parceiro.link_url} />
            </div>
          )}

          <div className="grid grid-cols-3 gap-4 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
            <div>
              <p className="text-xs text-neutral-500">Indicações</p>
              <p className="text-lg font-bold">{parceiro.referrals}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-500">Cliques</p>
              <p className="text-lg font-bold">
                {parceiro.clicks.toLocaleString("pt-BR")}
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-500">Comissão</p>
              <p className="text-lg font-bold">
                {formatter.format(parceiro.commission_cents / 100)}
              </p>
            </div>
          </div>

          <div className="mt-auto flex gap-3 border-t border-neutral-200 pt-4 dark:border-neutral-800">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() =>
                toast({
                  title: "E-mail enviado",
                  description: `Notificação enviada para ${parceiro.email || "—"}`,
                  variant: "success",
                })
              }
            >
              Enviar e-mail
            </Button>
            {parceiro.status !== "suspended" && (
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() =>
                  toast({
                    title: "Em breve",
                    description: "Suspensão de parceiro será implementada.",
                    variant: "warning",
                  })
                }
              >
                Suspender
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
