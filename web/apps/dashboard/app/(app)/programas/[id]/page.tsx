"use client";

import { useParams } from "next/navigation";
import { Button, Input, Badge, CopyLinkButton, toast } from "@indica/ui";
import Link from "next/link";

export default function EditarProgramaPage() {
  const params = useParams();
  const id = params.id as string;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
            Editar programa
          </h1>
          <p className="text-sm text-neutral-500">ID: {id}</p>
        </div>
        <Link href="/programas">
          <Button variant="ghost" size="sm">Voltar</Button>
        </Link>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="text-lg font-semibold">Dados do programa</h2>
        <div className="mt-4 space-y-4">
          <div>
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Nome</label>
            <Input defaultValue="Programa de Indicação Wenox" className="mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Descrição</label>
            <textarea
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
              rows={2}
              defaultValue="Programa de indicação com split flexível"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Status</label>
            <div className="mt-1">
              <Badge variant="success">Ativo</Badge>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Link de indicação</label>
            <div className="mt-1">
              <CopyLinkButton url="https://indica.ai/r/wenox-abc123" />
            </div>
          </div>
        </div>
        <div className="mt-6 flex gap-3">
          <Button onClick={() => toast({ title: "Programa atualizado", variant: "success" })}>
            Salvar alterações
          </Button>
          <Button variant="outline" onClick={() => toast({ title: "Programa pausado", variant: "warning" })}>
            Pausar programa
          </Button>
        </div>
      </div>
    </div>
  );
}
