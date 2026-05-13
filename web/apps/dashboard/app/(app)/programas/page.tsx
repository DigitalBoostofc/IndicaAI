"use client";

import { useEffect, useState } from "react";
import { Badge, Button, CopyLinkButton } from "@indica/ui";
import Link from "next/link";
import { programsApi, type Program, ApiError } from "../../lib/api";

const formatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function summarizeRule(rules: Record<string, unknown>): string {
  // rules.reward.type is the new shape (from the wizard).
  const reward = rules.reward as { type?: string; tiers?: unknown[]; max_pct?: number; amount_brl?: number; pct?: number } | undefined;
  const type = (reward?.type as string | undefined) || (rules.type as string | undefined);
  if (!type) return "Regra customizada";

  if (type === "tiered") {
    const n = (reward?.tiers || []).length;
    return `${n} ${n === 1 ? "nível" : "níveis"} de recompensa`;
  }
  if (type === "flexible_split") {
    return reward?.max_pct ? `Split flexível (até ${reward.max_pct}%)` : "Split flexível";
  }
  if (type === "commission_fixed" || type === "fixed") {
    const amount = (reward?.amount_brl ?? (rules.amount as number | undefined));
    return amount ? `${formatter.format(amount)} por venda` : "Comissão fixa";
  }
  if (type === "commission_pct" || type === "percentage") {
    const pct = reward?.pct ?? (rules.pct as number | undefined);
    return pct ? `${pct}% por venda` : "Comissão percentual";
  }
  if (type === "goal_based" || type === "goal") return "Recompensa por meta";
  return type;
}

function programLink(p: Program): string {
  const id = p.id.slice(0, 8);
  return `indica.ai/r/${id}`;
}

export default function ProgramasPage() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    programsApi
      .list()
      .then((data) => setPrograms(data || []))
      .catch((e: ApiError) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
          Programas
        </h1>
        <Link href="/programas/novo">
          <Button>+ Novo programa</Button>
        </Link>
      </div>

      {loading && (
        <p className="text-sm text-neutral-500">Carregando programas...</p>
      )}

      {error && (
        <div className="rounded-lg border border-error/30 bg-error/5 p-4 text-sm text-error">
          {error}
        </div>
      )}

      {!loading && !error && programs.length === 0 && (
        <div className="rounded-lg border border-dashed border-neutral-300 bg-white p-8 text-center dark:border-neutral-700 dark:bg-neutral-900">
          <p className="text-neutral-500">
            Nenhum programa ainda. Crie o primeiro pra começar a indicar.
          </p>
          <Link href="/programas/novo" className="mt-4 inline-block">
            <Button>+ Criar primeiro programa</Button>
          </Link>
        </div>
      )}

      <div className="space-y-4">
        {programs.map((prog) => (
          <div
            key={prog.id}
            className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold">{prog.name}</h2>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-neutral-500">
                  <Badge
                    variant={prog.status === "active" ? "success" : "warning"}
                  >
                    {prog.status === "active"
                      ? "Ativo"
                      : prog.status === "paused"
                        ? "Pausado"
                        : "Rascunho"}
                  </Badge>
                  <span>{prog.redirect_type}</span>
                </div>
                {prog.description && (
                  <p className="mt-1 text-sm text-neutral-500">
                    {prog.description}
                  </p>
                )}
                <p className="mt-2 text-sm text-neutral-500">
                  Regra: {summarizeRule(prog.rules)}
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <CopyLinkButton url={`https://${programLink(prog)}`} />
              <div className="flex gap-2">
                <Link href={`/programas/${prog.id}`}>
                  <Button variant="ghost" size="sm">
                    Editar
                  </Button>
                </Link>
                <Button variant="ghost" size="sm">
                  ···
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
