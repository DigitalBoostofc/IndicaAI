import type { ReactNode } from "react";

// Layout para magic link / login do parceiro
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30">
      {children}
    </div>
  );
}
