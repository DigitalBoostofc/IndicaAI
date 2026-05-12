// CommissionAmount — design-system.md §7.4
// Exibe valores de comissão com formatação BRL

import { cn } from "../lib/utils";

interface CommissionAmountProps {
  amount: number;
  status: "pending" | "approved" | "paid" | "cancelled";
  loading?: boolean;
  className?: string;
}

const statusColors: Record<string, string> = {
  pending: "text-warning",
  approved: "text-success",
  paid: "text-success",
  cancelled: "text-error",
};

const statusLabels: Record<string, string> = {
  pending: "pendente",
  approved: "aprovada",
  paid: "paga",
  cancelled: "cancelada",
};

const formatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function CommissionAmount({ amount, status, loading, className }: CommissionAmountProps) {
  if (loading) {
    return (
      <div className={cn("space-y-1", className)}>
        <div className="h-6 w-24 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
        <div className="h-4 w-16 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
      </div>
    );
  }

  return (
    <div className={cn(className)}>
      <p className={cn("text-lg font-bold", statusColors[status])}>
        {formatter.format(amount)}
      </p>
      <p className={cn("text-xs", statusColors[status])}>
        {statusLabels[status]}
      </p>
    </div>
  );
}
