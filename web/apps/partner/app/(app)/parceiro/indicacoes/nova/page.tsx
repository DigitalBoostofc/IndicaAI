"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, cn, toast } from "@indica/ui";
import Link from "next/link";
import {
  partnerApi,
  type PartnerMe,
  type SplitChoice,
  ApiError,
} from "../../../../lib/api";

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 10 || digits.length === 11) return "+55" + digits;
  return "+" + digits;
}

interface SplitPreset {
  key: string;
  label: string;
  description: string;
  build: (maxPct: number) => SplitChoice;
}

const presets: SplitPreset[] = [
  {
    key: "all_commission",
    label: "Tudo como comissão",
    description: "Você fica com o benefício inteiro.",
    build: (m) => ({ commission_pct: m, discount_pct: 0 }),
  },
  {
    key: "half",
    label: "Meio a meio",
    description: "Metade pra você, metade desconto pro cliente.",
    build: (m) => ({ commission_pct: m / 2, discount_pct: m / 2 }),
  },
  {
    key: "all_discount",
    label: "Tudo como desconto",
    description: "Cliente paga menos. Bom argumento de venda.",
    build: (m) => ({ commission_pct: 0, discount_pct: m }),
  },
];

export default function NovaIndicacaoPage() {
  const router = useRouter();
  const [me, setMe] = useState<PartnerMe | null>(null);
  const [loadingMe, setLoadingMe] = useState(true);

  const [nome, setNome] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [presetKey, setPresetKey] = useState<string>("all_commission");
  const [customMode, setCustomMode] = useState(false);
  const [commissionPct, setCommissionPct] = useState(0);
  const [discountPct, setDiscountPct] = useState(0);

  useEffect(() => {
    partnerApi
      .me()
      .then(setMe)
      .catch(() => setMe(null))
      .finally(() => setLoadingMe(false));
  }, []);

  const reward = me?.program_rules?.reward;
  const isFlexible = reward?.type === "flexible_split";
  const maxPct = (reward?.max_pct as number | undefined) ?? 0;

  // Sync preset values when maxPct/preset changes.
  useEffect(() => {
    if (!isFlexible || customMode) return;
    const preset = presets.find((p) => p.key === presetKey);
    if (!preset) return;
    const choice = preset.build(maxPct);
    setCommissionPct(choice.commission_pct);
    setDiscountPct(choice.discount_pct);
  }, [isFlexible, customMode, presetKey, maxPct]);

  const totalSplit = commissionPct + discountPct;
  const splitInvalid = isFlexible && totalSplit > maxPct + 0.001;

  const computedSplit: SplitChoice | undefined = useMemo(() => {
    if (!isFlexible) return undefined;
    return { commission_pct: commissionPct, discount_pct: discountPct };
  }, [isFlexible, commissionPct, discountPct]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!phone.trim()) {
      toast({
        title: "WhatsApp obrigatório",
        description: "Informe o telefone da pessoa.",
        variant: "error",
      });
      return;
    }
    if (splitInvalid) {
      toast({
        title: "Divisão inválida",
        description: `Comissão + desconto não pode passar de ${maxPct}%.`,
        variant: "error",
      });
      return;
    }

    setIsLoading(true);
    try {
      await partnerApi.createLead({
        name: nome || undefined,
        phone_e164: normalizePhone(phone),
        email: email || undefined,
        notes: notes || undefined,
        split_choice: computedSplit,
      });
      toast({
        title: "Indicação cadastrada!",
        variant: "success",
      });
      setTimeout(() => router.push("/parceiro/indicacoes"), 600);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Erro inesperado";
      toast({
        title: "Não foi possível cadastrar",
        description: msg,
        variant: "error",
      });
      setIsLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/parceiro/indicacoes">
          <Button variant="ghost" size="sm">
            ← Voltar
          </Button>
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
            <Input
              className="mt-1"
              placeholder="Nome completo"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              WhatsApp (com DDD)
            </label>
            <Input
              className="mt-1"
              placeholder="(11) 99999-0000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              E-mail (opcional)
            </label>
            <Input
              type="email"
              className="mt-1"
              placeholder="email@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {loadingMe && (
            <p className="text-xs text-neutral-500">Carregando programa...</p>
          )}

          {/* Split flexível UI */}
          {isFlexible && (
            <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
              <p className="text-sm font-medium">
                Como você quer usar o benefício?
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                Este programa libera até <b>{maxPct}%</b> sobre cada venda. Você
                escolhe quanto pega de comissão e quanto vira desconto pro
                cliente.
              </p>

              <div className="mt-3 grid grid-cols-1 gap-2">
                {presets.map((p) => {
                  const choice = p.build(maxPct);
                  const active = !customMode && presetKey === p.key;
                  return (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => {
                        setCustomMode(false);
                        setPresetKey(p.key);
                      }}
                      className={cn(
                        "rounded-md border-2 p-3 text-left transition-colors",
                        active
                          ? "border-primary bg-primary-light"
                          : "border-neutral-200 hover:border-neutral-300 dark:border-neutral-800",
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{p.label}</span>
                        <span className="text-xs text-neutral-500">
                          {choice.commission_pct}% pra você ·{" "}
                          {choice.discount_pct}% desconto
                        </span>
                      </div>
                      <p className="text-xs text-neutral-500">{p.description}</p>
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => setCustomMode(true)}
                  className={cn(
                    "rounded-md border-2 p-3 text-left transition-colors",
                    customMode
                      ? "border-primary bg-primary-light"
                      : "border-neutral-200 hover:border-neutral-300 dark:border-neutral-800",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Personalizar</span>
                    {customMode && (
                      <span className="text-xs text-neutral-500">
                        soma deve ficar ≤ {maxPct}%
                      </span>
                    )}
                  </div>
                </button>
              </div>

              {customMode && (
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-neutral-500">
                      Comissão pra você (%)
                    </label>
                    <Input
                      type="number"
                      min={0}
                      max={maxPct}
                      step={0.5}
                      value={commissionPct}
                      onChange={(e) =>
                        setCommissionPct(Number(e.target.value) || 0)
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-neutral-500">
                      Desconto pro cliente (%)
                    </label>
                    <Input
                      type="number"
                      min={0}
                      max={maxPct}
                      step={0.5}
                      value={discountPct}
                      onChange={(e) =>
                        setDiscountPct(Number(e.target.value) || 0)
                      }
                    />
                  </div>
                </div>
              )}

              <div
                className={cn(
                  "mt-3 rounded-md px-3 py-2 text-xs",
                  splitInvalid
                    ? "bg-error/10 text-error"
                    : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
                )}
              >
                Total escolhido: <b>{totalSplit.toFixed(1)}%</b> de {maxPct}%
                {splitInvalid && " — passou do teto"}
              </div>
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Notas (opcional)
            </label>
            <textarea
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
              rows={2}
              placeholder="Alguma observação..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading || splitInvalid}
          >
            {isLoading ? "Cadastrando..." : "Cadastrar indicação"}
          </Button>
        </form>
      </div>
    </div>
  );
}
