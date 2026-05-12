// Wireframe §1.3 — Wizard de Criação de Programa (4 steps)
// Step 1: Nome → Step 2: Regra → Step 3: Destino → Step 4: Revisão

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Card, CardContent, RewardRulePreview, toast } from "@indica/ui";
import { cn } from "@indica/ui";
import Link from "next/link";

const steps = ["Nome", "Regra", "Destino", "Revisão"];

export default function NovoProgramaPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    nome: "",
    descricao: "",
    tipoRegra: "" as string,
    valorComissao: "",
    tipoValor: "fixo" as "fixo" | "percentual",
    quandoPagar: "sale.confirmed",
    comoPagar: "pix",
    valorMinimo: "50",
    destino: "whatsapp" as "whatsapp" | "site" | "landing",
    whatsappNumero: "",
    siteUrl: "",
    janelaAtribuicao: "30",
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
          Novo Programa
        </h1>
        <Button variant="ghost" size="sm">
          Salvar rascunho
        </Button>
      </div>

      {/* Stepper — wireframe: ● Nome ○ Regra ○ Destino ○ Revisão */}
      <div className="flex items-center gap-2">
        {steps.map((step, i) => (
          <div key={step} className="flex items-center gap-2">
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium",
                i <= currentStep
                  ? "bg-primary text-white"
                  : "bg-neutral-200 text-neutral-500 dark:bg-neutral-800"
              )}
            >
              {i < currentStep ? "✓" : i + 1}
            </div>
            <span
              className={cn(
                "text-sm font-medium",
                i <= currentStep ? "text-neutral-900 dark:text-neutral-50" : "text-neutral-400"
              )}
            >
              {step}
            </span>
            {i < steps.length - 1 && (
              <div className="mx-2 h-px w-8 bg-neutral-200 dark:bg-neutral-800" />
            )}
          </div>
        ))}
      </div>

      {/* Step 1 — Nome */}
      {currentStep === 0 && (
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div>
              <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Nome do programa
              </label>
              <Input
                className="mt-1"
                placeholder="Ex: Programa de Indicação Wenox"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Descrição (opcional)
              </label>
              <textarea
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
                rows={2}
                placeholder="Descreva o programa..."
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setCurrentStep(1)}>Próximo: Regra →</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2 — Regra (Motor de Regras em linguagem natural) */}
      {currentStep === 1 && (
        <Card>
          <CardContent className="space-y-6 pt-6">
            <h2 className="text-lg font-semibold">Como o parceiro recebe?</h2>

            {/* Cards de seleção de tipo */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <button
                onClick={() => setFormData({ ...formData, tipoRegra: "comissao" })}
                className={cn(
                  "rounded-lg border-2 p-4 text-left transition-colors",
                  formData.tipoRegra === "comissao"
                    ? "border-primary bg-primary-light"
                    : "border-neutral-200 hover:border-neutral-300 dark:border-neutral-800"
                )}
              >
                <span className="text-2xl">💰</span>
                <p className="mt-2 font-semibold">Comissão por venda</p>
                <p className="text-sm text-neutral-500">
                  O parceiro recebe R$ ou % a cada venda confirmada.
                </p>
              </button>

              <button
                onClick={() => setFormData({ ...formData, tipoRegra: "meta" })}
                className={cn(
                  "rounded-lg border-2 p-4 text-left transition-colors",
                  formData.tipoRegra === "meta"
                    ? "border-primary bg-primary-light"
                    : "border-neutral-200 hover:border-neutral-300 dark:border-neutral-800"
                )}
              >
                <span className="text-2xl">🎯</span>
                <p className="mt-2 font-semibold">Recompensa por meta</p>
                <p className="text-sm text-neutral-500">
                  Ao atingir N vendas, ganha um brinde ou crédito.
                </p>
              </button>

              <button
                onClick={() => setFormData({ ...formData, tipoRegra: "flexible" })}
                className={cn(
                  "rounded-lg border-2 p-4 text-left transition-colors",
                  formData.tipoRegra === "flexible"
                    ? "border-primary bg-primary-light"
                    : "border-neutral-200 hover:border-neutral-300 dark:border-neutral-800"
                )}
              >
                <span className="text-2xl">🔀</span>
                <p className="mt-2 font-semibold">Split flexível</p>
                <p className="text-sm text-neutral-500">
                  O parceiro escolhe: comissão ou desconto.
                </p>
              </button>
            </div>

            {/* Campos condicionais — Comissão por venda */}
            {formData.tipoRegra === "comissao" && (
              <div className="space-y-4 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
                <div>
                  <label className="text-sm font-medium">Qual o valor da comissão?</label>
                  <div className="mt-2 flex gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="tipoValor"
                        checked={formData.tipoValor === "fixo"}
                        onChange={() => setFormData({ ...formData, tipoValor: "fixo" })}
                      />
                      <span className="text-sm">R$ fixo por venda</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="tipoValor"
                        checked={formData.tipoValor === "percentual"}
                        onChange={() => setFormData({ ...formData, tipoValor: "percentual" })}
                      />
                      <span className="text-sm">% sobre o valor da venda</span>
                    </label>
                  </div>
                  <Input
                    className="mt-2 w-48"
                    placeholder={formData.tipoValor === "fixo" ? "100,00" : "10"}
                    value={formData.valorComissao}
                    onChange={(e) => setFormData({ ...formData, valorComissao: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Quando pagar?</label>
                  <select
                    className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
                    value={formData.quandoPagar}
                    onChange={(e) => setFormData({ ...formData, quandoPagar: e.target.value })}
                  >
                    <option value="sale.confirmed">Quando o lead fechar a venda</option>
                    <option value="payment.confirmed">Quando o pagamento for confirmado</option>
                    <option value="manual">Aprovação manual</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium">Como pagar?</label>
                  <select
                    className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
                    value={formData.comoPagar}
                    onChange={(e) => setFormData({ ...formData, comoPagar: e.target.value })}
                  >
                    <option value="pix">Pix automático</option>
                    <option value="credit">Crédito interno</option>
                    <option value="manual">Manual</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium">Valor mínimo para saque: R$</label>
                  <Input
                    className="mt-1 w-48"
                    value={formData.valorMinimo}
                    onChange={(e) => setFormData({ ...formData, valorMinimo: e.target.value })}
                  />
                </div>
              </div>
            )}

            {/* Preview da regra — wireframe: 📋 Preview da regra */}
            {formData.tipoRegra && (
              <RewardRulePreview
                rules={{
                  schemaVersion: 1,
                  trigger: formData.quandoPagar,
                  attributionWindowDays: Number(formData.janelaAtribuicao),
                  reward: {
                    type: formData.tipoValor === "fixo" ? "commission_fixed" : "commission_pct",
                    ...(formData.tipoValor === "fixo"
                      ? { amount_brl: Number(formData.valorComissao) || 100 }
                      : { pct: Number(formData.valorComissao) || 10 }),
                  },
                  payout: {
                    method: formData.comoPagar,
                    schedule: "on_approval",
                    minAmountBrl: Number(formData.valorMinimo),
                  },
                  limits: {},
                }}
              />
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep(0)}>
                ← Voltar
              </Button>
              <Button onClick={() => setCurrentStep(2)}>Próximo: Destino →</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3 — Destino do link */}
      {currentStep === 2 && (
        <Card>
          <CardContent className="space-y-6 pt-6">
            <h2 className="text-lg font-semibold">Para onde o parceiro indica?</h2>

            <div className="space-y-3">
              <button
                onClick={() => setFormData({ ...formData, destino: "whatsapp" })}
                className={cn(
                  "w-full rounded-lg border-2 p-4 text-left transition-colors",
                  formData.destino === "whatsapp"
                    ? "border-primary bg-primary-light"
                    : "border-neutral-200 hover:border-neutral-300 dark:border-neutral-800"
                )}
              >
                <span className="text-2xl">📱</span>
                <p className="mt-1 font-semibold">WhatsApp da empresa</p>
                {formData.destino === "whatsapp" && (
                  <Input
                    className="mt-2"
                    placeholder="(__) _____-____"
                    value={formData.whatsappNumero}
                    onChange={(e) => setFormData({ ...formData, whatsappNumero: e.target.value })}
                  />
                )}
              </button>

              <button
                onClick={() => setFormData({ ...formData, destino: "site" })}
                className={cn(
                  "w-full rounded-lg border-2 p-4 text-left transition-colors",
                  formData.destino === "site"
                    ? "border-primary bg-primary-light"
                    : "border-neutral-200 hover:border-neutral-300 dark:border-neutral-800"
                )}
              >
                <span className="text-2xl">🌐</span>
                <p className="mt-1 font-semibold">Site da empresa</p>
                {formData.destino === "site" && (
                  <Input
                    className="mt-2"
                    placeholder="https://..."
                    value={formData.siteUrl}
                    onChange={(e) => setFormData({ ...formData, siteUrl: e.target.value })}
                  />
                )}
              </button>

              <button
                onClick={() => setFormData({ ...formData, destino: "landing" })}
                className={cn(
                  "w-full rounded-lg border-2 p-4 text-left transition-colors",
                  formData.destino === "landing"
                    ? "border-primary bg-primary-light"
                    : "border-neutral-200 hover:border-neutral-300 dark:border-neutral-800"
                )}
              >
                <span className="text-2xl">📄</span>
                <p className="mt-1 font-semibold">Landing page do programa</p>
                <p className="text-sm text-neutral-500">Gerada automaticamente</p>
              </button>
            </div>

            {/* Janela de atribuição */}
            <div>
              <label className="text-sm font-medium">Janela de atribuição:</label>
              <select
                className="mt-1 rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
                value={formData.janelaAtribuicao}
                onChange={(e) => setFormData({ ...formData, janelaAtribuicao: e.target.value })}
              >
                <option value="7">7 dias</option>
                <option value="15">15 dias</option>
                <option value="30">30 dias</option>
                <option value="60">60 dias</option>
                <option value="90">90 dias</option>
              </select>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep(1)}>
                ← Voltar
              </Button>
              <Button onClick={() => setCurrentStep(3)}>Próximo: Revisão →</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4 — Revisão */}
      {currentStep === 3 && (
        <Card>
          <CardContent className="space-y-6 pt-6">
            <h2 className="text-lg font-semibold">Revise seu programa</h2>

            <div className="space-y-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
              <div className="flex justify-between">
                <span className="text-sm text-neutral-500">Nome</span>
                <span className="text-sm font-medium">{formData.nome || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-neutral-500">Regra</span>
                <span className="text-sm font-medium">
                  {formData.tipoRegra === "comissao"
                    ? `${formData.tipoValor === "fixo" ? "R$" : ""}${formData.valorComissao}${formData.tipoValor === "percentual" ? "%" : ""} por venda`
                    : formData.tipoRegra === "meta"
                      ? "Recompensa por meta"
                      : "Split flexível"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-neutral-500">Destino</span>
                <span className="text-sm font-medium">
                  {formData.destino === "whatsapp"
                    ? `WhatsApp (${formData.whatsappNumero})`
                    : formData.destino === "site"
                      ? formData.siteUrl
                      : "Landing page"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-neutral-500">Atribuição</span>
                <span className="text-sm font-medium">{formData.janelaAtribuicao} dias</span>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep(2)}>
                ← Voltar
              </Button>
              <Button onClick={() => {
                toast({
                  title: "Programa publicado!",
                  description: `"${formData.nome}" está ativo e pronto para receber indicações.`,
                  variant: "success",
                });
                setTimeout(() => router.push("/programas"), 1000);
              }}>
                Publicar programa
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
