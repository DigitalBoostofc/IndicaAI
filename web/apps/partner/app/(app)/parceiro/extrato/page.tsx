// Wireframe §2.5 — Extrato + Saque Pix
// Resumo (saldo, pendente, pago), botão saque, histórico

"use client";

import { useState } from "react";
import { Button, Badge, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, Input } from "@indica/ui";

const historico = [
  { data: "12/05", tipo: "Saque Pix", valor: "R$ 350,00", status: "Processando" },
  { data: "05/05", tipo: "Saque Pix", valor: "R$ 500,00", status: "Pago" },
  { data: "28/04", tipo: "Comissão", valor: "R$ 100,00", detalhe: "Maria S." },
  { data: "25/04", tipo: "Comissão", valor: "R$ 250,00", detalhe: "Pedro L." },
  { data: "20/04", tipo: "Saque Pix", valor: "R$ 200,00", status: "Pago" },
];

export default function ExtratoPage() {
  const [saqueOpen, setSaqueOpen] = useState(false);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
        Extrato
      </h1>

      {/* Resumo — wireframe: Saldo disponível | Pendente | Total já pago */}
      <div className="rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-neutral-500">Saldo disponível</span>
            <span className="text-2xl font-bold text-success">R$ 450,00</span>
          </div>
          <div className="flex items-center justify-between border-t border-neutral-200 pt-3 dark:border-neutral-800">
            <span className="text-neutral-500">Pendente de aprovação</span>
            <span className="font-medium">R$ 200,00</span>
          </div>
          <div className="flex items-center justify-between border-t border-neutral-200 pt-3 dark:border-neutral-800">
            <span className="text-neutral-500">Total já pago</span>
            <span className="font-medium">R$ 1.350,00</span>
          </div>
        </div>
      </div>

      {/* Botão saque */}
      <Button className="w-full" onClick={() => setSaqueOpen(true)}>
        Solicitar saque Pix
      </Button>

      {/* Chave Pix */}
      <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <p className="text-sm font-medium">Chave Pix cadastrada</p>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-sm text-neutral-500">CPF: ***.***.***-**</span>
          <Button variant="ghost" size="sm">Alterar</Button>
        </div>
      </div>

      {/* Histórico */}
      <div className="rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
          <h2 className="font-semibold">Histórico</h2>
        </div>
        <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
          {historico.map((item, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm">{item.data} · {item.tipo}</p>
                {item.detalhe && <p className="text-xs text-neutral-500">{item.detalhe}</p>}
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">{item.valor}</p>
                {item.status && (
                  <Badge variant={item.status === "Pago" ? "success" : "warning"} className="mt-0.5">
                    {item.status}
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dialog de saque */}
      <Dialog open={saqueOpen} onOpenChange={setSaqueOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Solicitar saque via Pix</DialogTitle>
            <DialogDescription>
              O pagamento será processado em até 2 dias úteis.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="rounded-lg bg-neutral-50 p-3 dark:bg-neutral-800">
              <p className="text-sm text-neutral-500">Valor disponível</p>
              <p className="text-xl font-bold">R$ 450,00</p>
            </div>

            <div>
              <label className="text-sm font-medium">Quanto deseja sacar?</label>
              <div className="mt-1 flex gap-2">
                <Input placeholder="R$ 0,00" className="flex-1" />
                <Button variant="outline" size="sm">Sacar tudo</Button>
              </div>
            </div>

            <div>
              <p className="text-sm text-neutral-500">Chave Pix: ***.***.***-** (CPF)</p>
              <Button variant="ghost" size="sm" className="mt-1 h-auto p-0">
                Alterar chave
              </Button>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setSaqueOpen(false)}>Cancelar</Button>
            <Button onClick={() => setSaqueOpen(false)}>Confirmar saque</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
