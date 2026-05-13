"use client";

import { useEffect, useState } from "react";
import { Sheet, SheetContent, Button, Input, toast } from "@indica/ui";
import {
  partnersApi,
  programsApi,
  type Program,
  ApiError,
} from "../../lib/api";

interface ConvidarParceiroSheetProps {
  onClose: () => void;
  onCreated?: () => void;
}

export function ConvidarParceiroSheet({
  onClose,
  onCreated,
}: ConvidarParceiroSheetProps) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [programs, setPrograms] = useState<Program[]>([]);
  const [programId, setProgramId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    programsApi
      .list()
      .then((data) => {
        const list = data || [];
        setPrograms(list);
        if (list.length > 0) setProgramId(list[0].id);
      })
      .catch(() => setPrograms([]));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome) return;
    if (!programId) {
      toast({
        title: "Programa obrigatório",
        description: "Crie um programa antes de cadastrar parceiros.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      await partnersApi.create({
        name: nome,
        email: email || undefined,
        phone_e164: telefone || undefined,
        program_id: programId,
      });
      toast({
        title: "Parceiro cadastrado!",
        description: `${nome} foi adicionado ao programa.`,
        variant: "success",
      });
      onCreated?.();
      onClose();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Erro inesperado";
      toast({
        title: "Falha ao cadastrar",
        description: msg,
        variant: "destructive",
      });
      setSubmitting(false);
    }
  }

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:w-[420px]">
        <div className="flex h-full flex-col">
          <div className="border-b border-neutral-200 pb-4 dark:border-neutral-800">
            <h2 className="text-lg font-semibold">Cadastrar parceiro</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Cadastre um novo parceiro e gere o link de indicação dele.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="flex flex-1 flex-col gap-4 py-6"
          >
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
              />
            </div>
            <div>
              <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Telefone (E.164)
              </label>
              <Input
                className="mt-1"
                placeholder="+5511999990000"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Programa
              </label>
              {programs.length === 0 ? (
                <p className="mt-1 text-xs text-error">
                  Nenhum programa cadastrado. Crie um em /programas/novo.
                </p>
              ) : (
                <select
                  className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
                  value={programId}
                  onChange={(e) => setProgramId(e.target.value)}
                >
                  {programs.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="mt-auto flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                type="button"
                onClick={onClose}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={submitting || programs.length === 0}
              >
                {submitting ? "Cadastrando..." : "Cadastrar"}
              </Button>
            </div>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
