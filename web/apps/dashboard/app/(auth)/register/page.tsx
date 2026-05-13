"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button, Input, toast, Toaster } from "@indica/ui";
import Link from "next/link";

const registerSchema = z.object({
  nome: z.string().min(2, "Informe seu nome completo"),
  email: z.string().email("Informe um e-mail válido"),
  senha: z.string().min(8, "A senha deve ter pelo menos 8 caracteres"),
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  async function onSubmit(data: RegisterForm) {
    setIsLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
      const res = await fetch(`${apiUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: data.email, password: data.senha, name: data.nome }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Erro" }));
        toast({
          title: "Erro ao criar conta",
          description: err.error || "Tente novamente",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
      const loginRes = await fetch(`${apiUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: data.email, password: data.senha }),
      });
      if (!loginRes.ok) {
        toast({
          title: "Conta criada!",
          description: "Faça login pra entrar",
          variant: "success",
        });
        setTimeout(() => router.push("/login"), 600);
        return;
      }
      toast({
        title: "Conta criada!",
        description: "Bem-vindo ao Indica AÍ! Redirecionando...",
        variant: "success",
      });
      setTimeout(() => router.push("/dashboard"), 600);
    } catch (e) {
      toast({
        title: "Erro de rede",
        description: "Não foi possível conectar ao servidor",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md px-4">
      <div className="rounded-lg border border-neutral-200 bg-white p-8 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <h1 className="text-center text-2xl font-bold">Crie sua conta gratuita</h1>

        {/* Google OAuth */}
        <Button
          variant="outline"
          className="mt-6 w-full"
          onClick={() =>
            toast({
              title: "Google OAuth",
              description: "Integração com Google será implementada no backend.",
              variant: "default",
            })
          }
        >
          Entrar com Google
        </Button>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-neutral-200 dark:border-neutral-800" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white px-2 text-neutral-500 dark:bg-neutral-900">
              ou continue com e-mail
            </span>
          </div>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Nome completo
            </label>
            <Input
              className="mt-1"
              placeholder="Seu nome"
              {...register("nome")}
            />
            {errors.nome && (
              <p className="mt-1 text-xs text-error">{errors.nome.message}</p>
            )}
          </div>
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
              Senha (mín. 8 caracteres)
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

          <div className="flex items-start gap-2">
            <input type="checkbox" className="mt-1 rounded border-neutral-300" />
            <label className="text-sm text-neutral-600 dark:text-neutral-400">
              Li e aceito os{" "}
              <a href="/termos" className="text-primary hover:underline">
                Termos de Uso
              </a>{" "}
              e a{" "}
              <a href="/privacidade" className="text-primary hover:underline">
                Política de Privacidade
              </a>
            </label>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Criando conta..." : "Criar conta"}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-neutral-500">
          Já tem conta?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Entrar
          </Link>
        </p>
      </div>
      <Toaster />
    </div>
  );
}
