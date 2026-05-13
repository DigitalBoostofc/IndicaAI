// LeadStatusBadge — design-system.md §7.3
// Badge especializado com cor + ícone por status do lead

import { cn } from "../lib/utils";
import type { LeadStatus } from "@indica/api-client";

interface LeadStatusBadgeProps {
  status: LeadStatus;
  className?: string;
}

const statusConfig: Record<LeadStatus, { label: string; className: string; dot: string }> = {
  new: {
    label: "Novo",
    className: "bg-info-light text-info",
    dot: "bg-info",
  },
  in_progress: {
    label: "Em atendimento",
    className: "bg-warning-light text-warning",
    dot: "bg-warning",
  },
  qualified: {
    label: "Qualificado",
    className: "bg-secondary-light text-secondary",
    dot: "bg-secondary",
  },
  closed: {
    label: "Fechado",
    className: "bg-success-light text-success",
    dot: "bg-success",
  },
  lost: {
    label: "Não fechou",
    className: "bg-neutral-100 text-neutral-400",
    dot: "bg-neutral-400",
  },
};

export function LeadStatusBadge({ status, className }: LeadStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
        config.className,
        className
      )}
      aria-label={`Status: ${config.label}`}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", config.dot)} aria-hidden="true" />
      {config.label}
    </span>
  );
}
