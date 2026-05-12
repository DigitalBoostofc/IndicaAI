// RewardRulePreview — design-system.md §7.6
// Preview ao vivo da regra configurada em linguagem natural

import type { ProgramRules } from "@indica/api-client";
import { cn } from "../lib/utils";

interface RewardRulePreviewProps {
  rules: ProgramRules;
  onEdit?: () => void;
  className?: string;
}

function describeReward(rules: ProgramRules): string {
  const { reward, payout } = rules;

  switch (reward.type) {
    case "commission_fixed":
      return `Toda vez que um indicado fechar uma venda, o parceiro recebe R$ ${(reward as unknown as { amount_brl: number }).amount_brl.toLocaleString("pt-BR")} no ${payout.method === "pix" ? "Pix" : payout.method}.`;
    case "commission_pct":
      return `O parceiro recebe ${(reward as unknown as { pct: number }).pct}% sobre cada venda confirmada.`;
    case "flexible_split":
      return `O parceiro escolhe como dividir até ${(reward as unknown as { max_pct: number }).max_pct}% entre comissão e desconto para o cliente.`;
    case "goal_based":
      return `Ao atingir ${(reward as unknown as { target: number }).target} indicações aprovadas, o parceiro recebe a recompensa configurada.`;
    case "points":
      return `O parceiro acumula pontos a cada indicação que se converte em venda.`;
    case "cashback":
      return `O próprio cliente indicado recebe ${(reward as unknown as { pct: number }).pct}% de cashback na compra.`;
    default:
      return "Regra personalizada.";
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
        <p>{describeReward(rules)}</p>
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
