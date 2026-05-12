// StatCard — design-system.md §7.1
// Card de estatística para o dashboard

import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "../lib/utils";

export interface StatCardProps extends HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string;
  delta?: {
    value: string;
    positive?: boolean;
    neutral?: boolean;
  };
  icon?: ReactNode;
  loading?: boolean;
}

const StatCard = forwardRef<HTMLDivElement, StatCardProps>(
  ({ className, label, value, delta, icon, loading, ...props }, ref) => {
    if (loading) {
      return (
        <div
          ref={ref}
          className={cn(
            "rounded-lg border border-neutral-200 bg-white p-6 shadow-sm dark:bg-neutral-900 dark:border-neutral-800",
            className
          )}
          {...props}
        >
          <div className="h-4 w-24 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
          <div className="mt-3 h-8 w-20 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
          <div className="mt-2 h-4 w-32 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={cn(
          "rounded-lg border border-neutral-200 bg-white p-6 shadow-sm dark:bg-neutral-900 dark:border-neutral-800",
          className
        )}
        {...props}
      >
        <div className="flex items-start justify-between">
          <p className="text-sm text-neutral-500">{label}</p>
          {icon && <div className="text-neutral-400">{icon}</div>}
        </div>
        <p className="mt-2 text-3xl font-bold text-neutral-900 dark:text-neutral-50">
          {value}
        </p>
        {delta && (
          <p
            className={cn(
              "mt-1 text-sm",
              delta.positive && "text-success",
              delta.neutral && "text-neutral-500",
              !delta.positive && !delta.neutral && "text-error"
            )}
          >
            {delta.value}
          </p>
        )}
      </div>
    );
  }
);
StatCard.displayName = "StatCard";

export { StatCard };
