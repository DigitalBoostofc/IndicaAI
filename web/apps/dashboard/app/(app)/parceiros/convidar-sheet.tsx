"use client";

import { useState } from "react";
import { Sheet, SheetContent, Button, Input, toast } from "@indica/ui";

interface ConvidarParceiroSheetProps {
  onClose: () => void;
}

export function ConvidarParceiroSheet({ onClose }: ConvidarParceiroSheetProps) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome || !email) return;

    toast({
      title: "Convite enviado!",
      description: `Um link de cadastro foi enviado para ${email}`,
      variant: "success",
    });
    onClose();
  }

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:w-[420px]">
        <div className="flex h-full flex-col">
          <div className="border-b border-neutral-200 pb-4 dark:border-neutral-800">
            <h2 className="text-lg font-semibold">Cadastrar parceiro</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Envie um convite para um novo parceiro participar do programa.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4 py-6">
            <div>
              <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Nome completo
              </label>
              <Input
                className="mt-1"
                placeholder="Nome do parceiro"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                E-mail
              </label>
              <Input
                type="email"
                className="mt-1"
                placeholder="parceiro@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Telefone
              </label>
              <Input
                className="mt-1"
                placeholder="(11) 99999-0000"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Programa
              </label>
              <select className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800">
                <option>Programa de Indicação Wenox</option>
                <option>Ótica Premium — Indique e Ganhe</option>
                <option>Academia Ferro+ — Bora Treinar</option>
              </select>
            </div>

            <div className="mt-auto flex gap-3">
              <Button variant="outline" className="flex-1" type="button" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" className="flex-1">
                Enviar convite
              </Button>
            </div>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
