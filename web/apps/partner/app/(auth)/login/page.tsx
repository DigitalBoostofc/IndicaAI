"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Toaster, toast } from "@indica/ui";
import { authApi, ApiError } from "../../lib/api";

export default function PartnerLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [devToken, setDevToken] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    try {
      const res = await authApi.requestMagicLink(email);
      setSent(true);
      if (res.dev_token) {
        setDevToken(res.dev_token);
      } else {
        toast({
          title: "Link enviado!",
          description: `Enviamos um link de acesso para ${email}`,
          variant: "success",
        });
      }
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Erro de rede";
      toast({
        title: "Falha ao solicitar",
        description: msg,
        variant: "error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDevConfirm() {
    if (!devToken) return;
    setIsLoading(true);
    try {
      await authApi.verifyMagicLink(devToken);
      router.push("/parceiro");
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Erro de rede";
      toast({
        title: "Falha ao confirmar",
        description: msg,
        variant: "error",
      });
      setIsLoading(false);
    }
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

            {devToken && (
              <div className="mt-4 rounded-md border border-warning/40 bg-warning/5 p-3 text-left text-xs text-neutral-700 dark:text-neutral-300">
                <p className="font-semibold">Modo dev — sem servidor de e-mail</p>
                <p className="mt-1">Use o botão abaixo para simular o clique no link.</p>
                <Button
                  size="sm"
                  className="mt-3 w-full"
                  onClick={handleDevConfirm}
                  disabled={isLoading}
                >
                  {isLoading ? "Entrando..." : "Confirmar acesso (dev)"}
                </Button>
              </div>
            )}

            <Button
              variant="outline"
              className="mt-4 w-full"
              onClick={() => {
                setSent(false);
                setDevToken(null);
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
