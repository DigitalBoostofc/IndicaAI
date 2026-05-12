"use client";

import { Sheet, SheetContent, Badge, Button, CopyLinkButton, toast } from "@indica/ui";
import type { MockPartner } from "@indica/api-client/mocks";

interface ParceiroSheetProps {
  parceiro: MockPartner;
  onClose: () => void;
}

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

export function ParceiroSheet({ parceiro, onClose }: ParceiroSheetProps) {
  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:w-[480px]">
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="border-b border-neutral-200 pb-4 dark:border-neutral-800">
            <h2 className="text-lg font-semibold">Parceiro: {parceiro.nome}</h2>
            <div className="mt-2 flex items-center gap-3 text-sm text-neutral-500">
              <span>Programa: {parceiro.programa}</span>
              <Badge variant={statusVariant[parceiro.status]}>
                {statusLabel[parceiro.status]}
              </Badge>
            </div>
            <div className="mt-2 space-y-1 text-sm text-neutral-500">
              <p>E-mail: {parceiro.email}</p>
              <p>Telefone: {parceiro.telefone}</p>
              <p>Cadastrado em: {new Date(parceiro.criadoEm).toLocaleDateString("pt-BR")}</p>
            </div>
          </div>

          {/* Link de indicação */}
          <div className="py-4">
            <h3 className="mb-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
              Link de indicação
            </h3>
            <CopyLinkButton url={`https://${parceiro.link}`} />
          </div>

          {/* Chave PIX */}
          {parceiro.pixKey && (
            <div className="pb-4">
              <h3 className="mb-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                Chave PIX
              </h3>
              <p className="rounded-md border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-800">
                {parceiro.pixKey}{" "}
                <span className="text-xs text-neutral-400">({parceiro.pixKeyType})</span>
              </p>
            </div>
          )}

          {/* Métricas */}
          <div className="grid grid-cols-3 gap-4 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
            <div>
              <p className="text-xs text-neutral-500">Indicações</p>
              <p className="text-lg font-bold">{parceiro.indicacoes}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-500">Cliques</p>
              <p className="text-lg font-bold">{parceiro.cliques.toLocaleString("pt-BR")}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-500">Comissão</p>
              <p className="text-lg font-bold">{formatter.format(parceiro.comissao)}</p>
            </div>
          </div>

          {/* Ações */}
          <div className="flex gap-3 border-t border-neutral-200 pt-4 dark:border-neutral-800 mt-auto">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() =>
                toast({
                  title: "E-mail enviado",
                  description: `Notificação enviada para ${parceiro.email}`,
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
                    title: "Parceiro suspenso",
                    description: `${parceiro.nome} foi suspenso.`,
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
