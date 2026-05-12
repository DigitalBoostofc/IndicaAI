"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, toast } from "@indica/ui";
import Link from "next/link";

export default function NovaIndicacaoPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    setTimeout(() => {
      toast({
        title: "Indicação cadastrada!",
        description: "O lead foi registrado e será processado em breve.",
        variant: "success",
      });
      setTimeout(() => router.push("/parceiro/indicacoes"), 800);
    }, 1000);
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/parceiro/indicacoes">
          <Button variant="ghost" size="sm">← Voltar</Button>
        </Link>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
          Nova indicação
        </h1>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="text-lg font-semibold">Quem você está indicando?</h2>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Nome da pessoa
            </label>
            <Input className="mt-1" placeholder="Nome completo" required />
          </div>

          <div>
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              WhatsApp (com DDD)
            </label>
            <Input className="mt-1" placeholder="(__) _____-____" required />
          </div>

          <div>
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              E-mail (opcional)
            </label>
            <Input type="email" className="mt-1" placeholder="email@exemplo.com" />
          </div>

          {/* Split flexível */}
          <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
            <p className="text-sm font-medium">Como você quer usar o benefício?</p>
            <div className="mt-2 space-y-2">
              <label className="flex items-center gap-2">
                <input type="radio" name="split" defaultChecked />
                <span className="text-sm">Tudo como comissão (20%)</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="split" />
                <span className="text-sm">Meio a meio (10% comissão + 10% desconto)</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="split" />
                <span className="text-sm">Tudo como desconto para o cliente (20%)</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="split" />
                <span className="text-sm">Personalizar</span>
              </label>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Notas (opcional)
            </label>
            <textarea
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
              rows={2}
              placeholder="Alguma observação..."
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Cadastrando..." : "Cadastrar indicação"}
          </Button>
        </form>
      </div>
    </div>
  );
}
