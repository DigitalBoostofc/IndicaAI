"use client";

import { useState, useCallback } from "react";

export interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: "default" | "success" | "error" | "warning" | "destructive";
  duration?: number;
}

let globalToasts: Toast[] = [];
let globalListeners: Array<(toasts: Toast[]) => void> = [];

function notify() {
  for (const listener of globalListeners) {
    listener([...globalToasts]);
  }
}

let counter = 0;

export function toast({
  title,
  description,
  variant = "default",
  duration = 4000,
}: Omit<Toast, "id">) {
  const id = String(++counter);
  const newToast: Toast = { id, title, description, variant, duration };
  globalToasts = [...globalToasts, newToast];
  notify();

  if (duration > 0) {
    setTimeout(() => {
      globalToasts = globalToasts.filter((t) => t.id !== id);
      notify();
    }, duration);
  }

  return id;
}

export function dismissToast(id: string) {
  globalToasts = globalToasts.filter((t) => t.id !== id);
  notify();
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>(globalToasts);

  useState(() => {
    globalListeners.push(setToasts);
    return () => {
      globalListeners = globalListeners.filter((l) => l !== setToasts);
    };
  });

  const dismiss = useCallback((id: string) => {
    dismissToast(id);
  }, []);

  return { toasts, toast, dismiss };
}
