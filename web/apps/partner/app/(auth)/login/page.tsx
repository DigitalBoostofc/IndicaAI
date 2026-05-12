"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Toaster, toast } from "@indica/ui";

export default function PartnerLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    setSent(true);

    toast({
      title: "Link enviado!",
      description: `Enviamos um link de acesso para ${email}`,
      variant: "success",
    });

    // Simula o parceiro clicando no link do e-mail após 2s
    setTimeout(() => {
      toast({
        title: "Acesso confirmado",
        description: "Redirecionando para seu painel...",
        variant: "success",
      });
      setTimeout(() => router.push("/parceiro"), 800);
    }, 2000);
  }

  return (
    <div className="w-full max-w-sm px-4">
      <div className="rounded-lg border border-neutral-200 bg-white p-8 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        {!sent ? (
          <>
            <div className="text-center">
              <h1 className="text-2xl font-bold">Olá! Bom ver você de volta</h1>
              <p className="mt-2 text-sm text-neutral-500">
                Acesse seu painel de parceiro
              </p>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  E-mail
                </label>
                <Input
                  type="email"
                  className="mt-1"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Enviando..." : "Enviar link de acesso"}
              </Button>
            </form>

            <p className="mt-4 text-center text-sm text-neutral-500">
              Sem senha pra lembrar — só email.
              <br />
              Enviaremos um link mágico para você entrar.
            </p>
          </>
        ) : (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-light text-3xl">
              ✉️
            </div>
            <h2 className="text-xl font-bold">Verifique seu e-mail</h2>
            <p className="mt-2 text-sm text-neutral-500">
              Enviamos um link para{" "}
              <span className="font-medium text-neutral-700 dark:text-neutral-300">
                {email}
              </span>
            </p>
            <p className="mt-1 text-sm text-neutral-500">
              Clique nele em até 15 minutos para acessar.
            </p>
            <p className="mt-4 text-xs text-neutral-400">
              Redirecionando automaticamente...
            </p>
            <Button
              variant="outline"
              className="mt-4 w-full"
              onClick={() => {
                setSent(false);
                setIsLoading(false);
              }}
            >
              Voltar
            </Button>
          </div>
        )}
      </div>
      <Toaster />
    </div>
  );
}
