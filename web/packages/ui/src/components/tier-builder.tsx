"use client";

import { Trash2, Plus, ArrowRight } from "lucide-react";
import { cn } from "../lib/utils";
import { Button } from "./ui/button";

export type TierRewardType =
  | "commission_pct"
  | "commission_fixed"
  | "product"
  | "points";

export interface Tier {
  from: number;
  to: number | null;
  reward_type: TierRewardType;
  reward_value: number | string;
}

interface TierBuilderProps {
  tiers: Tier[];
  onChange: (tiers: Tier[]) => void;
  metricLabel?: string;
  className?: string;
}

const rewardTypeOptions: { value: TierRewardType; label: string }[] = [
  { value: "commission_pct", label: "% Comissão" },
  { value: "commission_fixed", label: "Valor Fixo" },
  { value: "product", label: "Produto" },
  { value: "points", label: "Pontos" },
];

function rewardSuffix(type: TierRewardType): string {
  switch (type) {
    case "commission_pct":
      return "%";
    case "commission_fixed":
      return "R$";
    case "product":
      return "";
    case "points":
      return "pts";
  }
}

export function TierBuilder({
  tiers,
  onChange,
  metricLabel = "indicações",
  className,
}: TierBuilderProps) {
  function updateTier(index: number, patch: Partial<Tier>) {
    const next = tiers.map((t, i) => (i === index ? { ...t, ...patch } : t));
    onChange(next);
  }

  function addTier() {
    const last = tiers[tiers.length - 1];
    const from = last?.to ?? 0;
    onChange([
      ...tiers,
      {
        from,
        to: from + 5,
        reward_type: "commission_pct",
        reward_value: 5,
      },
    ]);
  }

  function removeTier(index: number) {
    onChange(tiers.filter((_, i) => i !== index));
  }

  return (
    <div
      className={cn(
        "rounded-lg border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900",
        className,
      )}
    >
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
          Regras do Programa
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={addTier}
          type="button"
          className="gap-1"
        >
          <Plus className="h-3.5 w-3.5" />
          Adicionar Regra
        </Button>
      </div>

      {tiers.length === 0 && (
        <p className="rounded-md border border-dashed border-neutral-300 p-4 text-center text-sm text-neutral-500 dark:border-neutral-700">
          Nenhuma regra ainda. Adicione a primeira pra começar.
        </p>
      )}

      <div className="space-y-3">
        {tiers.map((tier, i) => {
          const isProduct = tier.reward_type === "product";
          const isOpenEnded = tier.to == null;
          return (
            <div
              key={i}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-800/50"
            >
              <div className="flex items-center gap-2 text-sm">
                <span className="text-neutral-500">De</span>
                <input
                  type="number"
                  min={0}
                  className="w-16 rounded-md border border-neutral-200 bg-white px-2 py-1.5 text-center text-sm dark:border-neutral-700 dark:bg-neutral-900"
                  value={tier.from}
                  onChange={(e) =>
                    updateTier(i, { from: Number(e.target.value) || 0 })
                  }
                />
                <span className="text-neutral-500">até</span>
                <input
                  type="number"
                  min={tier.from + 1}
                  placeholder="∞"
                  className="w-16 rounded-md border border-neutral-200 bg-white px-2 py-1.5 text-center text-sm dark:border-neutral-700 dark:bg-neutral-900"
                  value={isOpenEnded ? "" : tier.to ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    updateTier(i, { to: v === "" ? null : Number(v) });
                  }}
                />
                <span className="text-neutral-500">{metricLabel}</span>
              </div>

              <ArrowRight className="h-4 w-4 text-primary" />

              <div className="flex items-center gap-2 text-sm">
                <select
                  className="rounded-md border border-neutral-200 bg-white px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                  value={tier.reward_type}
                  onChange={(e) =>
                    updateTier(i, {
                      reward_type: e.target.value as TierRewardType,
                      reward_value:
                        e.target.value === "product" ? "" : 0,
                    })
                  }
                >
                  {rewardTypeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>

                {isProduct ? (
                  <input
                    type="text"
                    placeholder="ex: óculos"
                    className="w-40 rounded-md border border-neutral-200 bg-white px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                    value={String(tier.reward_value)}
                    onChange={(e) =>
                      updateTier(i, { reward_value: e.target.value })
                    }
                  />
                ) : (
                  <>
                    <input
                      type="number"
                      min={0}
                      step={
                        tier.reward_type === "commission_pct" ? 0.5 : 1
                      }
                      className="w-20 rounded-md border border-neutral-200 bg-white px-2 py-1.5 text-center text-sm dark:border-neutral-700 dark:bg-neutral-900"
                      value={Number(tier.reward_value) || 0}
                      onChange={(e) =>
                        updateTier(i, {
                          reward_value: Number(e.target.value) || 0,
                        })
                      }
                    />
                    <span className="text-neutral-500">
                      {rewardSuffix(tier.reward_type)}
                    </span>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={() => removeTier(i)}
                className="ml-auto rounded-md p-1.5 text-error transition-colors hover:bg-error/10"
                aria-label="Remover regra"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
