"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  StatCard,
  CopyLinkButton,
  Badge,
  Button,
  toast,
} from "@indica/ui";
import Link from "next/link";
import {
  authApi,
  partnerApi,
  type PartnerMe,
  type PartnerReferral,
  ApiError,
} from "../../lib/api";

const formatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
});

const statusLabels: Record<
  PartnerReferral["status"],
  { label: string; variant: "success" | "warning" | "default" | "destructive" }
> = {
  closed: { label: "Fechado", variant: "success" },
  in_progress: { label: "Em atendimento", variant: "warning" },
  qualified: { label: "Qualificado", variant: "default" },
  new: { label: "Novo", variant: "default" },
  lost: { label: "Não fechou", variant: "destructive" },
};

export default function ParceiroDashboard() {
  const router = useRouter();
  const [me, setMe] = useState<PartnerMe | null>(null);
  const [referrals, setReferrals] = useState<PartnerReferral[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    Promise.all([partnerApi.me(), partnerApi.referrals()])
      .then(([m, refs]) => {
        setMe(m);
        setReferrals(refs || []);
      })
      .catch((e: ApiError) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await authApi.logout();
    } catch {}
    router.push("/login");
  }

  if (loading) {
    return <p className="text-sm text-neutral-500">Carregando...</p>;
  }
  if (error || !me) {
    const looksLikeMissingPartner =
      error?.toLowerCase().includes("partner not found");
    return (
      <div className="mx-auto max-w-md space-y-4 rounded-lg border border-neutral-200 bg-white p-6 text-center dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="text-lg font-semibold">
          {looksLikeMissingPartner
            ? "Esta conta não é de parceiro"
            : "Não foi possível carregar"}
        </h2>
        <p className="text-sm text-neutral-500">
          {looksLikeMissingPartner
            ? "Você está autenticado, mas o e-mail dessa sessão não está vinculado a nenhum parceiro. Saia e entre com o e-mail do parceiro."
            : error}
        </p>
        <Button
          variant="default"
          className="w-full"
          disabled={loggingOut}
          onClick={handleLogout}
        >
          {loggingOut ? "Saindo..." : "Sair e entrar como parceiro"}
        </Button>
      </div>
    );
  }

  const firstName = me.name.split(" ")[0];
  const recent = referrals.slice(0, 5);

  function whatsappShare() {
    if (!me?.link_url) return;
    const text = `Oi! Olha esse desconto/oferta especial: ${me.link_url}`;
    window.open(
      `https://wa.me/?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener",
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
          Olá, {firstName}!
        </h1>
        <Button
          variant="ghost"
          size="sm"
          disabled={loggingOut}
          onClick={handleLogout}
        >
          {loggingOut ? "Saindo..." : "Sair"}
        </Button>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <p className="mb-2 text-sm font-medium">Seu link de indicação</p>
        {me.link_url ? (
          <>
            <CopyLinkButton url={me.link_url} />
            <Button
              variant="outline"
              className="mt-3 w-full"
              size="sm"
              onClick={whatsappShare}
            >
              Compartilhar via WhatsApp
            </Button>
          </>
        ) : (
          <p className="text-sm text-neutral-500">
            Link ainda não gerado pra este parceiro.
          </p>
        )}
        <p className="mt-2 text-xs text-neutral-500">
          Programa: {me.program_name}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="A receber"
          value={formatter.format(
            (me.pending_rewards_cents + me.approved_rewards_cents) / 100,
          )}
        />
        <StatCard
          label="Indicações"
          value={me.referrals.toLocaleString("pt-BR")}
        />
        <StatCard label="Cliques no link" value={me.clicks.toLocaleString("pt-BR")} />
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
          <h2 className="font-semibold">Últimas indicações</h2>
          <Link href="/parceiro/indicacoes">
            <Button variant="ghost" size="sm">
              Ver todas
            </Button>
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="px-4 py-6 text-sm text-neutral-500">
            Você ainda não tem indicações. Compartilhe seu link!
          </p>
        ) : (
          <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {recent.map((r) => (
              <div
                key={r.lead_id}
                className="flex items-center justify-between px-4 py-3"
              >
                <div>
                  <p className="font-medium">{r.lead_name || "—"}</p>
                  <p className="text-sm text-neutral-500">
                    {dateFormatter.format(new Date(r.created_at))}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={statusLabels[r.status].variant}>
                    {statusLabels[r.status].label}
                  </Badge>
                  <span className="text-sm font-medium">
                    {r.sale_amount_cents
                      ? formatter.format(r.sale_amount_cents / 100)
                      : "—"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Link href="/parceiro/indicacoes/nova">
        <Button className="w-full" variant="default">
          + Cadastrar indicação manual
        </Button>
      </Link>
    </div>
  );
}
