// RewardRulePreview — design-system.md §7.6
// Preview ao vivo da regra configurada em linguagem natural

import type { ProgramRules } from "@indica/api-client";
import { cn } from "../lib/utils";

interface RewardRulePreviewProps {
  rules: ProgramRules;
  onEdit?: () => void;
  className?: string;
}

type TierRewardLite = {
  from: number;
  to: number | null;
  reward_type: "commission_pct" | "commission_fixed" | "product" | "points";
  reward_value: number | string;
};

function describeTier(t: TierRewardLite, metricLabel: string): string {
  const rangeLabel =
    t.to == null
      ? `${t.from}+ ${metricLabel}`
      : `${t.from} a ${t.to} ${metricLabel}`;
  let rewardLabel = "";
  switch (t.reward_type) {
    case "commission_pct":
      rewardLabel = `${t.reward_value}% de comissão`;
      break;
    case "commission_fixed":
      rewardLabel = `R$ ${Number(t.reward_value).toLocaleString("pt-BR")} por venda`;
      break;
    case "product":
      rewardLabel = `produto: ${t.reward_value || "—"}`;
      break;
    case "points":
      rewardLabel = `${t.reward_value} pontos`;
      break;
  }
  return `${rangeLabel} → ${rewardLabel}`;
}

function describeReward(rules: ProgramRules): { text?: string; tiers?: string[] } {
  const { reward, payout } = rules;
  const r = reward as unknown as {
    type: string;
    amount_brl?: number;
    pct?: number;
    max_pct?: number;
    target?: number;
    metric?: string;
    tiers?: TierRewardLite[];
  };

  switch (r.type) {
    case "tiered": {
      const metric = r.metric === "sales_count"
        ? "vendas"
        : r.metric === "sale_amount"
          ? "R$ em vendas"
          : "indicações";
      return {
        tiers: (r.tiers || []).map((t) => describeTier(t, metric)),
      };
    }
    case "commission_fixed":
      return {
        text: `Toda vez que um indicado fechar uma venda, o parceiro recebe R$ ${(r.amount_brl || 0).toLocaleString("pt-BR")} no ${payout.method === "pix" ? "Pix" : payout.method}.`,
      };
    case "commission_pct":
      return { text: `O parceiro recebe ${r.pct ?? 0}% sobre cada venda confirmada.` };
    case "flexible_split":
      return {
        text: `O parceiro escolhe como dividir até ${r.max_pct ?? 0}% entre comissão e desconto para o cliente.`,
      };
    case "goal_based":
      return {
        text: `Ao atingir ${r.target ?? 0} indicações aprovadas, o parceiro recebe a recompensa configurada.`,
      };
    case "points":
      return { text: "O parceiro acumula pontos a cada indicação que se converte em venda." };
    case "cashback":
      return { text: `O próprio cliente indicado recebe ${r.pct ?? 0}% de cashback na compra.` };
    default:
      return { text: "Regra personalizada." };
  }
}

function describePayout(rules: ProgramRules): string {
  const { payout } = rules;
  const methodLabels: Record<string, string> = {
    pix: "Pix",
    credit: "crédito interno",
    coupon: "cupom",
    physical: "brinde",
  };
  const scheduleLabels: Record<string, string> = {
    on_approval: "automático na aprovação",
    manual: "manual",
    monthly: "mensal",
  };

  const method = methodLabels[payout.method] || payout.method;
  const schedule = scheduleLabels[payout.schedule] || payout.schedule;

  return `Pagamento: ${method}, ${schedule}`;
}

export function RewardRulePreview({ rules, onEdit, className }: RewardRulePreviewProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-neutral-200 bg-white p-6 shadow-sm dark:bg-neutral-900 dark:border-neutral-800",
        className
      )}
    >
      <div className="flex items-center gap-2 text-sm font-semibold text-neutral-800 dark:text-neutral-100">
        <span aria-hidden="true">📋</span>
        Resumo da regra
      </div>

      <div className="mt-4 space-y-3 text-sm text-neutral-600 dark:text-neutral-300">
        {(() => {
          const r = describeReward(rules);
          if (r.tiers) {
            if (r.tiers.length === 0) {
              return <p className="text-neutral-400">Sem regras configuradas ainda.</p>;
            }
            return (
              <ul className="space-y-1.5">
                {r.tiers.map((line, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-0.5 text-xs text-primary">●</span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            );
          }
          return <p>{r.text}</p>;
        })()}
        <p className="text-neutral-500">
          Condição: {rules.trigger === "sale.confirmed" ? "venda confirmada" : rules.trigger}
        </p>
        <p className="text-neutral-500">{describePayout(rules)}</p>
        {rules.payout.minAmountBrl && (
          <p className="text-neutral-500">
            Valor mínimo: R$ {rules.payout.minAmountBrl.toLocaleString("pt-BR")}
          </p>
        )}
      </div>

      {onEdit && (
        <button
          onClick={onEdit}
          className="mt-4 text-sm font-medium text-primary hover:underline"
        >
          Editar regra
        </button>
      )}
    </div>
  );
}
