"use client";

import { Button, Input, toast } from "@indica/ui";

export default function ConfiguracoesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
        Configurações
      </h1>

      {/* Dados pessoais */}
      <div className="rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="text-lg font-semibold">Dados pessoais</h2>
        <div className="mt-4 space-y-4">
          <div>
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Nome</label>
            <Input defaultValue="Karine Silva" className="mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">E-mail</label>
            <Input defaultValue="karine.silva@email.com" className="mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Telefone</label>
            <Input defaultValue="(11) 99999-0001" className="mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Chave Pix</label>
            <div className="mt-1 flex gap-2">
              <Input defaultValue="123.456.789-00" className="flex-1" />
              <Button variant="outline" size="sm" onClick={() => toast({ title: "Chave Pix atualizada", variant: "success" })}>
                Alterar
              </Button>
            </div>
          </div>
        </div>
        <Button className="mt-6" onClick={() => toast({ title: "Dados salvos", description: "Suas informações foram atualizadas.", variant: "success" })}>
          Salvar
        </Button>
      </div>

      {/* LGPD */}
      <div className="rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="text-lg font-semibold">Seus direitos (LGPD)</h2>
        <p className="mt-2 text-sm text-neutral-500">
          Você tem direito sobre seus dados pessoais.
        </p>
        <div className="mt-4 space-y-3">
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => toast({ title: "Solicitação enviada", description: "Você receberá uma cópia dos seus dados em até 15 dias.", variant: "success" })}
          >
            Solicitar cópia dos meus dados
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => toast({ title: "Solicitação enviada", description: "Entraremos em contato para corrigir seus dados.", variant: "success" })}
          >
            Corrigir meus dados
          </Button>
          <Button
            variant="destructive"
            className="w-full justify-start"
            onClick={() => toast({ title: "Tem certeza?", description: "Esta ação é irreversível.", variant: "warning" })}
          >
            Solicitar exclusão da minha conta
          </Button>
        </div>
        <p className="mt-4 text-xs text-neutral-400">
          Suas solicitações são processadas em até 15 dias. Dúvidas?{" "}
          <a href="mailto:privacidade@indica.ai" className="text-primary hover:underline">
            privacidade@indica.ai
          </a>
        </p>
      </div>

      {/* Notificações */}
      <div className="rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="text-lg font-semibold">Notificações</h2>
        <div className="mt-4 space-y-3">
          <label className="flex items-center justify-between">
            <span className="text-sm">E-mail sobre novas indicações</span>
            <input type="checkbox" defaultChecked className="rounded border-neutral-300" />
          </label>
          <label className="flex items-center justify-between">
            <span className="text-sm">E-mail sobre pagamentos</span>
            <input type="checkbox" defaultChecked className="rounded border-neutral-300" />
          </label>
          <label className="flex items-center justify-between">
            <span className="text-sm">WhatsApp sobre novas indicações</span>
            <input type="checkbox" className="rounded border-neutral-300" />
          </label>
        </div>
        <Button
          className="mt-4"
          onClick={() => toast({ title: "Preferências salvas", variant: "success" })}
        >
          Salvar preferências
        </Button>
      </div>
    </div>
  );
}
