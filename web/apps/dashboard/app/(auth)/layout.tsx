import type { ReactNode } from "react";

// Layout para telas de autenticação (login, registro, magic link)
// Sem sidebar, sem header autenticado — tela limpa centralizada
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30">
      {children}
    </div>
  );
}
