"use client";

import { useToast, dismissToast, type Toast } from "../../hooks/use-toast";
import { cn } from "../../lib/utils";
import { X } from "lucide-react";

const variantStyles: Record<string, string> = {
  default: "border-neutral-200 bg-white text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-50",
  success: "border-success/30 bg-success-light text-success dark:bg-success/20",
  error: "border-error/30 bg-error-light text-error dark:bg-error/20",
  warning: "border-warning/30 bg-warning-light text-warning dark:bg-warning/20",
};

export function Toaster() {
  const { toasts } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 sm:max-w-sm">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  );
}

function ToastItem({ toast }: { toast: Toast }) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border p-4 shadow-lg animate-in slide-in-from-bottom-5 fade-in-0",
        variantStyles[toast.variant ?? "default"]
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex-1">
        {toast.title && <p className="text-sm font-semibold">{toast.title}</p>}
        {toast.description && (
          <p className="mt-1 text-sm opacity-80">{toast.description}</p>
        )}
      </div>
      <button
        onClick={() => dismissToast(toast.id)}
        className="shrink-0 rounded-md p-1 opacity-60 hover:opacity-100"
        aria-label="Fechar notificação"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
