// Button — customizado conforme design-system.md §6.1
// Variantes: default, secondary, outline, ghost, destructive, link, icon

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", loading, disabled, children, ...props }, ref) => {
    return (
      <button
        className={cn(
          // Base
          "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
          // Variantes
          variant === "default" && "bg-primary text-primary-foreground hover:bg-primary-hover",
          variant === "secondary" && "bg-secondary text-secondary-foreground hover:bg-secondary-hover",
          variant === "outline" && "border border-neutral-300 text-neutral-700 bg-background hover:bg-neutral-100",
          variant === "ghost" && "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900",
          variant === "destructive" && "bg-error text-white hover:bg-error/90",
          variant === "link" && "text-primary underline-offset-4 hover:underline",
          // Tamanhos (design-system: sm=32px, default=36px, lg=40px)
          size === "default" && "h-9 px-4 py-2",
          size === "sm" && "h-8 rounded-md px-3 text-xs",
          size === "lg" && "h-10 rounded-md px-8",
          size === "icon" && "h-9 w-9 rounded-md",
          className
        )}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg
            className="mr-2 h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button };
