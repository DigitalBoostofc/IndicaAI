"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authApi, ApiError } from "../../lib/api";

function VerifyContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = params.get("token");
    if (!token) {
      setError("Token ausente. Solicite um novo link.");
      return;
    }
    authApi
      .verifyMagicLink(token)
      .then(() => router.replace("/parceiro"))
      .catch((e: ApiError) =>
        setError(e.message || "Link inválido ou expirado."),
      );
  }, [params, router]);

  return (
    <div className="w-full max-w-sm px-4 text-center">
      <div className="rounded-lg border border-neutral-200 bg-white p-8 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        {error ? (
          <>
            <h2 className="text-lg font-semibold text-error">Falhou</h2>
            <p className="mt-2 text-sm text-neutral-500">{error}</p>
            <a
              href="/login"
              className="mt-4 inline-block text-sm text-primary hover:underline"
            >
              Voltar para login
            </a>
          </>
        ) : (
          <p className="text-sm text-neutral-500">Confirmando acesso...</p>
        )}
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <p className="text-sm text-neutral-500">Confirmando acesso...</p>
      }
    >
      <VerifyContent />
    </Suspense>
  );
}
