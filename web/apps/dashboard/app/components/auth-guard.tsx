"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { authApi, ApiError } from "../lib/api";

export function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    authApi
      .me()
      .then(() => setAuthenticated(true))
      .catch((e: ApiError) => {
        if (e.status === 401) {
          router.replace("/login");
        } else {
          setAuthenticated(true); // network issue, let user see error in pages
        }
      });
  }, [router]);

  if (authenticated === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-neutral-500">Carregando...</p>
      </div>
    );
  }

  return <>{children}</>;
}
