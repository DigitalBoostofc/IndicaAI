"use client";

import { StatCard, CopyLinkButton, Badge, Button, toast } from "@indica/ui";
import Link from "next/link";

const recentReferrals = [
  { nome: "Maria Silva", status: "closed" as const, valor: "R$100,00", data: "12/05" },
  { nome: "José Souza", status: "contacted" as const, valor: "—", data: "11/05" },
  { nome: "Ana Paula Ribeiro", status: "new" as const, valor: "—", data: "11/05" },
];

const statusLabels: Record<string, { label: string; variant: "success" | "warning" | "default" }> = {
  closed: { label: "Fechado", variant: "success" },
  contacted: { label: "Em atendimento", variant: "warning" },
  new: { label: "Novo", variant: "default" },
};

export default function ParceiroDashboard() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
        Olá, Karine!
      </h1>

      {/* Link de indicação */}
      <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <p className="mb-2 text-sm font-medium">Seu link de indicação</p>
        <CopyLinkButton url="https://indica.ai/r/karine-8xk92a" />
        <Button
          variant="outline"
          className="mt-3 w-full"
          size="sm"
          onClick={() =>
            toast({
              title: "Link copiado!",
              description: "Cole no WhatsApp para compartilhar.",
              variant: "success",
            })
          }
        >
          Compartilhar via WhatsApp
        </Button>
      </div>

      {/* StatCards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Saldo disponível" value="R$ 450,00" />
        <StatCard label="Indicações ativas" value="8" />
        <StatCard label="Próximo pagamento" value="20/05" />
      </div>

      {/* Últimas indicações */}
      <div className="rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
          <h2 className="font-semibold">Últimas indicações</h2>
          <Link href="/parceiro/indicacoes">
            <Button variant="ghost" size="sm">Ver todas</Button>
          </Link>
        </div>
        <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
          {recentReferrals.map((r) => (
            <div key={r.nome} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="font-medium">{r.nome}</p>
                <p className="text-sm text-neutral-500">{r.data}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={statusLabels[r.status].variant}>
                  {statusLabels[r.status].label}
                </Badge>
                <span className="text-sm font-medium">{r.valor}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Botão indicação manual */}
      <Link href="/parceiro/indicacoes/nova">
        <Button className="w-full" variant="default">
          + Cadastrar indicação manual
        </Button>
      </Link>
    </div>
  );
}
