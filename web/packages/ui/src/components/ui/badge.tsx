// Badge — customizado conforme design-system.md §6.9
// Variantes: default, success, warning, destructive, secondary, outline

import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "success" | "warning" | "destructive" | "secondary" | "outline";
}

const Badge = forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = "default", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-xs font-medium transition-colors",
          variant === "default" && "bg-primary-light text-primary-dark",
          variant === "success" && "bg-success-light text-success",
          variant === "warning" && "bg-warning-light text-warning",
          variant === "destructive" && "bg-error-light text-error",
          variant === "secondary" && "bg-secondary-light text-secondary",
          variant === "outline" && "border border-neutral-300 text-neutral-600",
          className
        )}
        {...props}
      />
    );
  }
);
Badge.displayName = "Badge";

export { Badge };
