"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button, Input, toast, Toaster } from "@indica/ui";
import Link from "next/link";

const loginSchema = z.object({
  email: z.string().email("Informe um e-mail válido"),
  senha: z.string().min(8, "A senha deve ter pelo menos 8 caracteres"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  function onSubmit(_data: LoginForm) {
    setIsLoading(true);
    setTimeout(() => {
      toast({
        title: "Login simulado",
        description: "Bem-vindo de volta! Redirecionando...",
        variant: "success",
      });
      setTimeout(() => router.push("/dashboard"), 800);
    }, 1000);
  }

  return (
    <div className="w-full max-w-sm px-4">
      <div className="rounded-lg border border-neutral-200 bg-white p-8 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <h1 className="text-center text-2xl font-bold">Entrar</h1>
        <p className="mt-2 text-center text-sm text-neutral-500">
          Acesse o painel da sua empresa
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              E-mail
            </label>
            <Input
              type="email"
              className="mt-1"
              placeholder="voce@email.com"
              {...register("email")}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-error">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Senha
            </label>
            <Input
              type="password"
              className="mt-1"
              placeholder="••••••••"
              {...register("senha")}
            />
            {errors.senha && (
              <p className="mt-1 text-xs text-error">{errors.senha.message}</p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2">
              <input type="checkbox" className="rounded border-neutral-300" />
              <span className="text-sm text-neutral-600 dark:text-neutral-400">
                Lembrar-me
              </span>
            </label>
            <Link
              href="/forgot-password"
              className="text-sm text-primary hover:underline"
            >
              Esqueci a senha
            </Link>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Entrando..." : "Entrar"}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-neutral-500">
          Não tem conta?{" "}
          <Link href="/register" className="text-primary hover:underline">
            Cadastre-se
          </Link>
        </p>
      </div>
      <Toaster />
    </div>
  );
}
