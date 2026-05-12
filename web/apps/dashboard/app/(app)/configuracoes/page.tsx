"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger, Button, Input, toast } from "@indica/ui";

export default function ConfiguracoesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
        Configurações
      </h1>

      <Tabs defaultValue="perfil">
        <TabsList>
          <TabsTrigger value="perfil">Perfil</TabsTrigger>
          <TabsTrigger value="empresa">Empresa</TabsTrigger>
          <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          <TabsTrigger value="equipe">Equipe</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>

        {/* Aba Perfil */}
        <TabsContent value="perfil">
          <div className="max-w-lg space-y-6">
            <div className="rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
              <h2 className="text-lg font-semibold">Perfil</h2>
              <div className="mt-4 space-y-4">
                <div>
                  <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Nome</label>
                  <Input defaultValue="Leonardo Groff" className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">E-mail</label>
                  <div className="mt-1 flex gap-2">
                    <Input defaultValue="leonardo@email.com" className="flex-1" />
                    <Button variant="outline" size="sm" onClick={() => toast({ title: "E-mail atualizado", variant: "success" })}>
                      Alterar
                    </Button>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Telefone</label>
                  <div className="mt-1 flex gap-2">
                    <Input defaultValue="(11) 99999-0000" className="flex-1" />
                    <Button variant="outline" size="sm" onClick={() => toast({ title: "Telefone atualizado", variant: "success" })}>
                      Alterar
                    </Button>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Senha</label>
                  <div className="mt-1 flex gap-2">
                    <Input type="password" defaultValue="********" className="flex-1" />
                    <Button variant="outline" size="sm" onClick={() => toast({ title: "Senha alterada", variant: "success" })}>
                      Alterar senha
                    </Button>
                  </div>
                </div>
              </div>
              <Button className="mt-6" onClick={() => toast({ title: "Perfil salvo", description: "Suas alterações foram salvas.", variant: "success" })}>
                Salvar alterações
              </Button>
            </div>

            {/* Zona de perigo */}
            <div className="rounded-lg border border-error/20 bg-error-light/10 p-6">
              <h2 className="text-lg font-semibold text-error">Zona de perigo</h2>
              <p className="mt-1 text-sm text-neutral-600">
                Ações irreversíveis que afetam permanentemente sua conta.
              </p>
              <Button
                variant="destructive"
                size="sm"
                className="mt-4"
                onClick={() =>
                  toast({
                    title: "Tem certeza?",
                    description: "Esta ação não pode ser desfeita.",
                    variant: "warning",
                  })
                }
              >
                Excluir minha conta
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Aba Empresa */}
        <TabsContent value="empresa">
          <div className="max-w-lg rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
            <h2 className="text-lg font-semibold">Dados da empresa</h2>
            <div className="mt-4 space-y-4">
              <div>
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Nome da empresa</label>
                <Input defaultValue="Minha Empresa" className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">CNPJ</label>
                <Input defaultValue="12.345.678/0001-99" className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Subdomínio</label>
                <Input defaultValue="minha-empresa" className="mt-1" />
                <p className="mt-1 text-xs text-neutral-500">minha-empresa.indica.ai</p>
              </div>
            </div>
            <Button className="mt-6" onClick={() => toast({ title: "Empresa atualizada", variant: "success" })}>
              Salvar
            </Button>
          </div>
        </TabsContent>

        {/* Aba WhatsApp */}
        <TabsContent value="whatsapp">
          <div className="max-w-lg rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
            <h2 className="text-lg font-semibold">WhatsApp</h2>
            <p className="mt-2 text-sm text-neutral-500">
              Configure o número de WhatsApp e a mensagem pré-preenchida para indicações.
            </p>
            <div className="mt-4 space-y-4">
              <div>
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Número do WhatsApp</label>
                <Input defaultValue="+55 (11) 99999-0000" className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Mensagem padrão</label>
                <textarea
                  className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
                  rows={3}
                  defaultValue="Olá! Indiquei você para o programa. Acesse: {{link}}"
                />
              </div>
            </div>
            <Button className="mt-6" onClick={() => toast({ title: "WhatsApp configurado", variant: "success" })}>
              Salvar
            </Button>
          </div>
        </TabsContent>

        {/* Aba Webhooks */}
        <TabsContent value="webhooks">
          <div className="max-w-lg rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
            <h2 className="text-lg font-semibold">Webhooks</h2>
            <p className="mt-2 text-sm text-neutral-500">
              Configure endpoints para receber notificações de eventos.
            </p>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between rounded-md border border-neutral-200 p-3 dark:border-neutral-800">
                <div>
                  <p className="text-sm font-medium">lead.created</p>
                  <p className="text-xs text-neutral-500">https://api.empresa.com/webhook</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => toast({ title: "Webhook removido", variant: "warning" })}>
                  Remover
                </Button>
              </div>
              <div className="flex items-center justify-between rounded-md border border-neutral-200 p-3 dark:border-neutral-800">
                <div>
                  <p className="text-sm font-medium">commission.paid</p>
                  <p className="text-xs text-neutral-500">https://api.empresa.com/webhook</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => toast({ title: "Webhook removido", variant: "warning" })}>
                  Remover
                </Button>
              </div>
            </div>
            <Button variant="outline" className="mt-4" onClick={() => toast({ title: "Formulário de webhook", description: "Em breve: adicionar novo webhook.", variant: "default" })}>
              + Adicionar webhook
            </Button>
          </div>
        </TabsContent>

        {/* Aba Equipe */}
        <TabsContent value="equipe">
          <div className="max-w-lg rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
            <h2 className="text-lg font-semibold">Equipe</h2>
            <p className="mt-2 text-sm text-neutral-500">
              Gerencie membros da equipe e permissões.
            </p>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between rounded-md border border-neutral-200 p-3 dark:border-neutral-800">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-light text-sm font-bold text-primary">L</div>
                  <div>
                    <p className="text-sm font-medium">Leonardo Groff</p>
                    <p className="text-xs text-neutral-500">Admin · leonardo@email.com</p>
                  </div>
                </div>
                <span className="text-xs text-neutral-400">Você</span>
              </div>
              <div className="flex items-center justify-between rounded-md border border-neutral-200 p-3 dark:border-neutral-800">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-sm font-bold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">M</div>
                  <div>
                    <p className="text-sm font-medium">Maria Helena</p>
                    <p className="text-xs text-neutral-500">Editor · maria@empresa.com</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => toast({ title: "Membro removido", variant: "warning" })}>
                  Remover
                </Button>
              </div>
            </div>
            <Button variant="outline" className="mt-4" onClick={() => toast({ title: "Convite enviado", description: "O membro receberá um e-mail de convite.", variant: "success" })}>
              + Convidar membro
            </Button>
          </div>
        </TabsContent>

        {/* Aba Billing */}
        <TabsContent value="billing">
          <div className="max-w-lg space-y-6">
            <div className="rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
              <h2 className="text-lg font-semibold">Plano atual</h2>
              <div className="mt-4 flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">Pro</p>
                  <p className="text-sm text-neutral-500">R$ 297,00/mês</p>
                </div>
                <Button variant="outline" onClick={() => toast({ title: "Upgrade", description: "Redirecionando para o portal de billing...", variant: "default" })}>
                  Alterar plano
                </Button>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-neutral-500">Parceiros</p>
                  <p className="font-medium">12 / 50</p>
                </div>
                <div>
                  <p className="text-neutral-500">Indicações/mês</p>
                  <p className="font-medium">145 / 500</p>
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
              <h2 className="text-lg font-semibold">Histórico de faturas</h2>
              <div className="mt-4 space-y-2">
                {["Mai 2026", "Abr 2026", "Mar 2026"].map((mes) => (
                  <div key={mes} className="flex items-center justify-between rounded-md border border-neutral-200 p-3 dark:border-neutral-800">
                    <div>
                      <p className="text-sm font-medium">{mes}</p>
                      <p className="text-xs text-neutral-500">R$ 297,00</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => toast({ title: "Download iniciado", description: `Fatura ${mes} sendo baixada.`, variant: "default" })}>
                      Baixar
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
