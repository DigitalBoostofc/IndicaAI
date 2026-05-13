"use client";

import { useEffect, useState } from "react";
import { Button, Input, toast } from "@indica/ui";
import {
  partnerApi,
  type PartnerMe,
  type PixKeyType,
  ApiError,
} from "../../../lib/api";

const pixKeyTypeLabels: Record<PixKeyType, string> = {
  cpf: "CPF",
  cnpj: "CNPJ",
  email: "E-mail",
  phone: "Telefone",
  random: "Aleatória",
};

const pixKeyRegex: Record<PixKeyType, RegExp> = {
  cpf: /^\d{11}$/,
  cnpj: /^\d{14}$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^\+\d{10,15}$/,
  random: /^[0-9a-fA-F]{32}$/,
};

function validatePixKey(
  key: string,
  type: PixKeyType,
): string | null {
  if (!key.trim()) return "Informe a chave Pix.";
  if (!pixKeyRegex[type].test(key.trim())) {
    const hints: Record<PixKeyType, string> = {
      cpf: "11 dígitos numéricos",
      cnpj: "14 dígitos numéricos",
      email: "exemplo@email.com",
      phone: "formato E.164, ex: +5511999990001",
      random: "32 caracteres hexadecimais",
    };
    return `Chave inválida. Esperado: ${hints[type]}`;
  }
  return null;
}

export default function ConfiguracoesPage() {
  const [me, setMe] = useState<PartnerMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pix key state
  const [pixKeyType, setPixKeyType] = useState<PixKeyType>("cpf");
  const [pixKeyValue, setPixKeyValue] = useState("");
  const [pixSaving, setPixSaving] = useState(false);
  const [pixError, setPixError] = useState<string | null>(null);

  useEffect(() => {
    partnerApi
      .me()
      .then((m) => {
        setMe(m);
        setPixKeyValue("");
      })
      .catch((e: ApiError) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleUpdatePixKey() {
    const validation = validatePixKey(pixKeyValue, pixKeyType);
    if (validation) {
      setPixError(validation);
      return;
    }
    setPixError(null);
    setPixSaving(true);
    try {
      await partnerApi.updatePixKey({
        pix_key: pixKeyValue.trim(),
        pix_key_type: pixKeyType,
      });
      toast({ title: "Chave Pix atualizada", variant: "success" });
      setPixKeyValue("");
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Erro ao atualizar chave Pix.";
      setPixError(msg);
    } finally {
      setPixSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-neutral-500">Carregando...</p>;
  }

  if (error || !me) {
    return (
      <div className="rounded-lg border border-error/30 bg-error/5 p-4 text-sm text-error">
        {error ?? "Não foi possível carregar seus dados."}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
        Configurações
      </h1>

      {/* Dados pessoais (read-only no MVP) */}
      <div className="rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="text-lg font-semibold">Dados pessoais</h2>
        <div className="mt-4 space-y-4">
          <div>
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Nome
            </label>
            <Input defaultValue={me.name} className="mt-1" readOnly />
          </div>
          <div>
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              E-mail
            </label>
            <Input
              defaultValue={me.email ?? ""}
              className="mt-1"
              readOnly
            />
          </div>
          <div>
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Telefone
            </label>
            <Input
              defaultValue={me.phone_e164 ?? ""}
              className="mt-1"
              readOnly
            />
          </div>
        </div>
      </div>

      {/* Chave Pix */}
      <div className="rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="text-lg font-semibold">Chave Pix</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Esta chave será usada para receber seus pagamentos.
        </p>
        <div className="mt-4 space-y-4">
          <div>
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Tipo de chave
            </label>
            <select
              className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              value={pixKeyType}
              onChange={(e) => {
                setPixKeyType(e.target.value as PixKeyType);
                setPixError(null);
              }}
            >
              {Object.entries(pixKeyTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Chave
            </label>
            <Input
              className="mt-1"
              placeholder={
                pixKeyType === "cpf"
                  ? "00000000000"
                  : pixKeyType === "cnpj"
                    ? "00000000000000"
                    : pixKeyType === "email"
                      ? "exemplo@email.com"
                      : pixKeyType === "phone"
                        ? "+5511999990001"
                        : "32 caracteres hexadecimais"
              }
              value={pixKeyValue}
              onChange={(e) => {
                setPixKeyValue(e.target.value);
                setPixError(null);
              }}
            />
          </div>
          {pixError && (
            <p className="text-sm text-error">{pixError}</p>
          )}
          <Button
            onClick={handleUpdatePixKey}
            disabled={pixSaving || !pixKeyValue.trim()}
          >
            {pixSaving ? "Salvando..." : "Salvar chave Pix"}
          </Button>
        </div>
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
            onClick={() =>
              toast({
                title: "Solicitação enviada",
                description:
                  "Você receberá uma cópia dos seus dados em até 15 dias.",
                variant: "success",
              })
            }
          >
            Solicitar cópia dos meus dados
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() =>
              toast({
                title: "Solicitação enviada",
                description: "Entraremos em contato para corrigir seus dados.",
                variant: "success",
              })
            }
          >
            Corrigir meus dados
          </Button>
          <Button
            variant="destructive"
            className="w-full justify-start"
            onClick={() =>
              toast({
                title: "Tem certeza?",
                description: "Esta ação é irreversível.",
                variant: "warning",
              })
            }
          >
            Solicitar exclusão da minha conta
          </Button>
        </div>
        <p className="mt-4 text-xs text-neutral-400">
          Suas solicitações são processadas em até 15 dias. Dúvidas?{" "}
          <a
            href="mailto:privacidade@indica.ai"
            className="text-primary hover:underline"
          >
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
            <input
              type="checkbox"
              defaultChecked
              className="rounded border-neutral-300"
            />
          </label>
          <label className="flex items-center justify-between">
            <span className="text-sm">E-mail sobre pagamentos</span>
            <input
              type="checkbox"
              defaultChecked
              className="rounded border-neutral-300"
            />
          </label>
          <label className="flex items-center justify-between">
            <span className="text-sm">WhatsApp sobre novas indicações</span>
            <input type="checkbox" className="rounded border-neutral-300" />
          </label>
        </div>
        <Button
          className="mt-4"
          onClick={() =>
            toast({ title: "Preferências salvas", variant: "success" })
          }
        >
          Salvar preferências
        </Button>
      </div>
    </div>
  );
}
