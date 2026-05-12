"use client";

import { useState } from "react";
import { Button, Input, toast, Toaster } from "@indica/ui";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;

    setSent(true);
    toast({
      title: "E-mail enviado",
      description: `Instruções de recuperação foram enviadas para ${email}`,
      variant: "success",
    });
  }

  return (
    <div className="w-full max-w-sm px-4">
      <div className="rounded-lg border border-neutral-200 bg-white p-8 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        {!sent ? (
          <>
            <h1 className="text-center text-2xl font-bold">Recuperar senha</h1>
            <p className="mt-2 text-center text-sm text-neutral-500">
              Informe seu e-mail e enviaremos um link para redefinir sua senha.
            </p>

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
              <Button type="submit" className="w-full">
                Enviar link de recuperação
              </Button>
            </form>

            <p className="mt-4 text-center text-sm text-neutral-500">
              Lembrou a senha?{" "}
              <Link href="/login" className="text-primary hover:underline">
                Voltar ao login
              </Link>
            </p>
          </>
        ) : (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success-light text-3xl">
              ✓
            </div>
            <h2 className="text-xl font-bold">Verifique seu e-mail</h2>
            <p className="mt-2 text-sm text-neutral-500">
              Enviamos um link para{" "}
              <span className="font-medium text-neutral-700 dark:text-neutral-300">
                {email}
              </span>
            </p>
            <p className="mt-1 text-sm text-neutral-500">
              Clique nele em até 15 minutos para redefinir sua senha.
            </p>
            <Button
              variant="outline"
              className="mt-6 w-full"
              onClick={() => {
                setSent(false);
                setEmail("");
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
