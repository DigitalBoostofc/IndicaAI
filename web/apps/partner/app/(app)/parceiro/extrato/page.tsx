"use client";

import { useEffect, useState } from "react";
import { Badge, Button, StatCard } from "@indica/ui";
import {
  partnerApi,
  type Wallet,
  type Payout,
  ApiError,
} from "../../../lib/api";

const formatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const statusConfig: Record<
  Payout["status"],
  { label: string; variant: "success" | "warning" | "default" | "destructive" }
> = {
  pending: { label: "Aguardando processamento", variant: "warning" },
  processing: { label: "Em processamento", variant: "warning" },
  paid: { label: "Pago", variant: "success" },
  failed: { label: "Falhou", variant: "destructive" },
  cancelled: { label: "Cancelado", variant: "default" },
};

export default function ExtratoPage() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([partnerApi.wallet(), partnerApi.payouts({ limit: 50 })])
      .then(([w, p]) => {
        setWallet(w);
        setPayouts(p.items || []);
      })
      .catch((e: ApiError) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-sm text-neutral-500">Carregando...</p>;
  }

  if (error) {
    return (
      <div className="rounded-lg border border-error/30 bg-error/5 p-4 text-sm text-error">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
        Extrato
      </h1>

      {/* Resumo — wallet stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Saldo disponível"
          value={formatter.format((wallet?.available_cents ?? 0) / 100)}
        />
        <StatCard
          label="Em hold"
          value={formatter.format((wallet?.hold_cents ?? 0) / 100)}
        />
        <StatCard
          label="Pendente"
          value={formatter.format((wallet?.pending_cents ?? 0) / 100)}
        />
        <StatCard
          label="Total já pago"
          value={formatter.format((wallet?.total_paid_cents ?? 0) / 100)}
        />
      </div>

      {/* Info sobre pagamento automático (substitui o botão de saque) */}
      <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-50">
          Sobre os pagamentos
        </p>
        <p className="mt-1 text-sm text-neutral-500">
          Os pagamentos são processados automaticamente quando suas comissões
          saem do período de hold (geralmente 7 dias após aprovação). Você verá
          o pagamento aparecer aqui com status &quot;Aguardando
          processamento&quot;.
        </p>
      </div>

      {/* Histórico de payouts */}
      <div className="rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
          <h2 className="font-semibold">Histórico de pagamentos</h2>
        </div>

        {payouts.length === 0 ? (
          <p className="px-4 py-6 text-sm text-neutral-500">
            Nenhum pagamento ainda. Quando você acumular comissões e o período
            de hold expirar, um pagamento será criado automaticamente.
          </p>
        ) : (
          <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {payouts.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between px-4 py-3"
              >
                <div>
                  <p className="text-sm">
                    {dateFormatter.format(new Date(p.created_at))} · Pagamento
                  </p>
                  {p.pix_key && (
                    <p className="text-xs text-neutral-500">
                      Chave: {p.pix_key}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">
                    {formatter.format(p.amount_cents / 100)}
                  </p>
                  <Badge
                    variant={statusConfig[p.status].variant}
                    className="mt-0.5"
                  >
                    {statusConfig[p.status].label}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
