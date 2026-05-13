"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Input,
  RewardRulePreview,
  TierBuilder,
  type Tier,
  toast,
  cn,
} from "@indica/ui";
import { programsApi, ApiError } from "../../../lib/api";

type Preset = "commission" | "recurring" | "goal" | "flexible_split";
type Metric = "referrals_count" | "sales_count" | "sale_amount";

const presetOptions: { value: Preset; label: string; description: string }[] = [
  {
    value: "commission",
    label: "Comissão",
    description: "Parceiro recebe % ou R$ por venda. Pode ter níveis (ex: 0–5 = 5%, 5+ = 10%).",
  },
  {
    value: "recurring",
    label: "Recorrente",
    description: "Comissão repetida a cada renovação ou cobrança recorrente do cliente.",
  },
  {
    value: "goal",
    label: "Meta / Recompensa",
    description: "Ao atingir uma meta, o parceiro ganha produto, brinde ou pontos.",
  },
  {
    value: "flexible_split",
    label: "Split flexível",
    description: "O parceiro escolhe entre comissão e desconto até um teto (ex: 20%).",
  },
];

function defaultTiersFor(preset: Preset): Tier[] {
  switch (preset) {
    case "commission":
      return [
        { from: 0, to: null, reward_type: "commission_pct", reward_value: 10 },
      ];
    case "recurring":
      return [
        { from: 0, to: null, reward_type: "commission_pct", reward_value: 15 },
      ];
    case "goal":
      return [
        { from: 0, to: 4, reward_type: "commission_fixed", reward_value: 0 },
        { from: 5, to: null, reward_type: "product", reward_value: "Brinde" },
      ];
    case "flexible_split":
      return [];
  }
}

function defaultMetricFor(preset: Preset): Metric {
  if (preset === "goal") return "referrals_count";
  if (preset === "commission" || preset === "recurring") return "sales_count";
  return "referrals_count";
}

const metricLabel: Record<Metric, string> = {
  referrals_count: "indicações",
  sales_count: "vendas",
  sale_amount: "R$ em vendas",
};

export default function NovoProgramaPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");

  const [preset, setPreset] = useState<Preset>("commission");
  const [metric, setMetric] = useState<Metric>(defaultMetricFor("commission"));
  const [tiers, setTiers] = useState<Tier[]>(defaultTiersFor("commission"));
  const [flexMaxPct, setFlexMaxPct] = useState<number>(20);

  const [quandoPagar, setQuandoPagar] = useState("sale.confirmed");
  const [comoPagar, setComoPagar] = useState("pix");
  const [valorMinimo, setValorMinimo] = useState("50");
  const [janelaAtribuicao, setJanelaAtribuicao] = useState("30");

  const [destino, setDestino] = useState<"whatsapp" | "site" | "landing">(
    "whatsapp",
  );
  const [whatsappNumero, setWhatsappNumero] = useState("");
  const [siteUrl, setSiteUrl] = useState("");

  const isTiered = preset !== "flexible_split";

  const reward = useMemo(() => {
    if (preset === "flexible_split") {
      return { type: "flexible_split" as const, max_pct: flexMaxPct };
    }
    return {
      type: "tiered" as const,
      preset,
      metric,
      tiers,
    };
  }, [preset, metric, tiers, flexMaxPct]);

  const rulesPreview = {
    schemaVersion: 1,
    trigger: quandoPagar,
    attributionWindowDays: Number(janelaAtribuicao),
    reward,
    payout: {
      method: comoPagar,
      schedule: "on_approval",
      minAmountBrl: Number(valorMinimo) || 0,
    },
    limits: {},
  };

  function handlePresetChange(next: Preset) {
    setPreset(next);
    if (next !== "flexible_split") {
      setTiers(defaultTiersFor(next));
      setMetric(defaultMetricFor(next));
    }
  }

  async function publish() {
    if (!nome.trim()) {
      toast({ title: "Nome obrigatório", variant: "destructive" });
      return;
    }
    if (isTiered && tiers.length === 0) {
      toast({
        title: "Adicione pelo menos uma regra",
        variant: "destructive",
      });
      return;
    }
    if (destino === "whatsapp" && !whatsappNumero.trim()) {
      toast({
        title: "Informe o WhatsApp da empresa",
        variant: "destructive",
      });
      return;
    }
    if (destino === "site" && !siteUrl.trim()) {
      toast({
        title: "Informe a URL do site",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const redirectType =
        destino === "whatsapp"
          ? "whatsapp"
          : destino === "site"
            ? "url"
            : "landing";

      await programsApi.create({
        name: nome,
        description: descricao || undefined,
        rules: rulesPreview,
        redirect_type: redirectType,
        redirect_url: destino === "site" ? siteUrl : undefined,
        whatsapp_number: destino === "whatsapp" ? whatsappNumero : undefined,
      });

      toast({
        title: "Programa publicado!",
        description: `"${nome}" está ativo.`,
        variant: "success",
      });
      setTimeout(() => router.push("/programas"), 600);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Erro inesperado";
      toast({
        title: "Não foi possível publicar",
        description: msg,
        variant: "destructive",
      });
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-24">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
          Novo Programa
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Configure tudo em uma página só — nome, regras e onde o link leva.
        </p>
      </div>

      {/* Identidade */}
      <Section title="Identidade">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Nome do programa" required>
            <Input
              placeholder="Ex: Programa de Indicação Wenox"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
          </Field>
          <Field label="Descrição (opcional)">
            <Input
              placeholder="Ex: 20% flexível entre comissão e desconto"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
          </Field>
        </div>
      </Section>

      {/* Tipo + Regras */}
      <Section title="Como funciona a recompensa">
        <Field label="Tipo do programa" required>
          <select
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
            value={preset}
            onChange={(e) => handlePresetChange(e.target.value as Preset)}
          >
            {presetOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs text-neutral-500">
            {presetOptions.find((o) => o.value === preset)?.description}
          </p>
        </Field>

        {isTiered && (
          <>
            <Field label="Métrica do nível">
              <select
                className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
                value={metric}
                onChange={(e) => setMetric(e.target.value as Metric)}
              >
                <option value="referrals_count">Quantidade de indicações</option>
                <option value="sales_count">Vendas confirmadas</option>
                <option value="sale_amount">Valor total de vendas (R$)</option>
              </select>
            </Field>

            <TierBuilder
              tiers={tiers}
              onChange={setTiers}
              metricLabel={metricLabel[metric]}
            />
          </>
        )}

        {preset === "flexible_split" && (
          <Field label="Teto máximo de benefício (%)">
            <Input
              type="number"
              min={0}
              max={100}
              className="w-32"
              value={flexMaxPct}
              onChange={(e) => setFlexMaxPct(Number(e.target.value) || 0)}
            />
            <p className="mt-2 text-xs text-neutral-500">
              O parceiro divide esse teto entre comissão pra ele e desconto pra o
              cliente como preferir.
            </p>
          </Field>
        )}
      </Section>

      {/* Pagamento */}
      <Section title="Pagamento">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Quando pagar">
            <select
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
              value={quandoPagar}
              onChange={(e) => setQuandoPagar(e.target.value)}
            >
              <option value="sale.confirmed">Quando o lead fechar a venda</option>
              <option value="payment.confirmed">
                Quando o pagamento for confirmado
              </option>
              <option value="manual">Aprovação manual</option>
            </select>
          </Field>
          <Field label="Como pagar">
            <select
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
              value={comoPagar}
              onChange={(e) => setComoPagar(e.target.value)}
            >
              <option value="pix">Pix automático</option>
              <option value="credit">Crédito interno</option>
              <option value="manual">Manual</option>
            </select>
          </Field>
          <Field label="Valor mínimo de saque (R$)">
            <Input
              value={valorMinimo}
              onChange={(e) => setValorMinimo(e.target.value)}
            />
          </Field>
        </div>
      </Section>

      {/* Destino */}
      <Section title="Para onde o parceiro indica">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <DestinoCard
            active={destino === "whatsapp"}
            onClick={() => setDestino("whatsapp")}
            icon="📱"
            title="WhatsApp da empresa"
          />
          <DestinoCard
            active={destino === "site"}
            onClick={() => setDestino("site")}
            icon="🌐"
            title="Site da empresa"
          />
          <DestinoCard
            active={destino === "landing"}
            onClick={() => setDestino("landing")}
            icon="📄"
            title="Landing page do programa"
          />
        </div>

        {destino === "whatsapp" && (
          <Field label="Número do WhatsApp">
            <Input
              placeholder="+5511999990000"
              value={whatsappNumero}
              onChange={(e) => setWhatsappNumero(e.target.value)}
            />
          </Field>
        )}
        {destino === "site" && (
          <Field label="URL do site">
            <Input
              placeholder="https://..."
              value={siteUrl}
              onChange={(e) => setSiteUrl(e.target.value)}
            />
          </Field>
        )}

        <Field label="Janela de atribuição">
          <select
            className="w-48 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
            value={janelaAtribuicao}
            onChange={(e) => setJanelaAtribuicao(e.target.value)}
          >
            <option value="7">7 dias</option>
            <option value="15">15 dias</option>
            <option value="30">30 dias</option>
            <option value="60">60 dias</option>
            <option value="90">90 dias</option>
          </select>
        </Field>
      </Section>

      {/* Preview */}
      <RewardRulePreview rules={rulesPreview} />

      {/* Sticky footer */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-neutral-200 bg-white/90 px-4 py-3 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/90 lg:pl-72">
        <div className="mx-auto flex max-w-3xl items-center justify-end gap-3">
          <Button variant="outline" onClick={() => router.push("/programas")}>
            Cancelar
          </Button>
          <Button disabled={submitting} onClick={publish}>
            {submitting ? "Publicando..." : "Publicar programa"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
        {label}
        {required && <span className="ml-0.5 text-error">*</span>}
      </label>
      {children}
    </div>
  );
}

function DestinoCard({
  active,
  onClick,
  icon,
  title,
}: {
  active: boolean;
  onClick: () => void;
  icon: string;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg border-2 p-3 text-left transition-colors",
        active
          ? "border-primary bg-primary-light"
          : "border-neutral-200 hover:border-neutral-300 dark:border-neutral-800",
      )}
    >
      <span className="text-xl">{icon}</span>
      <p className="mt-1 text-sm font-medium">{title}</p>
    </button>
  );
}
