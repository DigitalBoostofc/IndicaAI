import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@indica/ui";

export const metadata: Metadata = {
  title: "Preços",
  description:
    "Quatro planos do trial gratuito ao Scale ilimitado. Sem cobrança transacional, sem fidelidade, cancele quando quiser. Pague em BRL via Pix, boleto ou cartão.",
  alternates: { canonical: "/precos" },
};

interface Tier {
  name: string;
  price: string;
  annualPrice?: string;
  blurb: string;
  features: string[];
  cta: string;
  ctaHref: string;
  highlighted?: boolean;
  footnote?: string;
}

const tiers: Tier[] = [
  {
    name: "Trial",
    price: "R$ 0",
    blurb: "14 dias com tudo destravado. Sem cartão de crédito.",
    features: [
      "1 programa de indicação",
      "Até 5 parceiros",
      "Até R$ 500 em comissões",
      "Rastreamento Pix + WhatsApp",
      "Documentação e comunidade",
    ],
    cta: "Começar trial",
    ctaHref: "/register?plan=trial",
  },
  {
    name: "Starter",
    price: "R$ 97",
    annualPrice: "R$ 87 no anual",
    blurb: "Para varejo pequeno e prestadores de serviço com indicação informal.",
    features: [
      "1 programa de indicação",
      "Até 20 parceiros ativos",
      "Até R$ 2.000 em comissões/mês",
      "Pagamento via Pix",
      "Rastreamento por link único",
      "Suporte por email em até 24h",
    ],
    cta: "Assinar Starter",
    ctaHref: "/register?plan=starter",
  },
  {
    name: "Growth",
    price: "R$ 297",
    annualPrice: "R$ 267 no anual",
    blurb: "Onde está a maioria dos clientes. Múltiplos programas + chat humano.",
    features: [
      "Até 3 programas simultâneos",
      "Até 100 parceiros ativos",
      "Até R$ 10.000 em comissões/mês",
      "Regras configuráveis (comissão, split, cashback, meta)",
      "Cupom de desconto automático para indicados",
      "Detecção anti-fraude integrada",
      "Chat + email com SLA 4h",
    ],
    cta: "Assinar Growth",
    ctaHref: "/register?plan=growth",
    highlighted: true,
    footnote: "Plano mais escolhido",
  },
  {
    name: "Scale",
    price: "R$ 697+",
    blurb: "Volume alto, white-label, integrações sob medida. Conversa direta.",
    features: [
      "Programas ilimitados",
      "Parceiros ilimitados",
      "Volume de comissões ilimitado",
      "White-label opcional (domínio próprio)",
      "API completa + webhooks",
      "Canal Slack dedicado + SLA contratual",
      "Onboarding white-glove",
    ],
    cta: "Falar com vendas",
    ctaHref: "mailto:vendas@indica.ai?subject=Plano%20Scale",
  },
];

const faqs = [
  {
    q: "Vocês cobram percentual sobre as comissões?",
    a: "Não. O preço do plano é fixo. Você paga seus parceiros 100% do que combinar com eles — nada vai para a Indica AÍ!.",
  },
  {
    q: "Posso trocar de plano a qualquer momento?",
    a: "Sim. Upgrade é imediato e cobrado pró-rata. Downgrade entra em vigor no próximo ciclo. Sem fidelidade, cancela quando quiser.",
  },
  {
    q: "O que acontece se eu ultrapassar o limite do plano?",
    a: "Avisamos por email e no painel quando você se aproxima do teto. Não bloqueamos features e não cobramos overage — sugerimos upgrade no momento certo.",
  },
  {
    q: "Como funciona o trial de 14 dias?",
    a: "Você cria a conta sem cartão, configura seu programa e testa com parceiros reais. No fim do trial, escolhe um plano pago ou a conta pausa (seus dados ficam guardados por 30 dias).",
  },
  {
    q: "A Indica AÍ! processa o Pix dos meus parceiros?",
    a: "No MVP, a confirmação do Pix é manual: você paga pelo seu banco e marca como pago no painel. Em breve teremos integração automática com Asaas/Stark Bank para Pix automático.",
  },
  {
    q: "Vocês emitem nota fiscal?",
    a: "Sim. NFS-e emitida via mecanismo eletrônico do município no fechamento do mês.",
  },
  {
    q: "Quais formas de pagamento aceitam?",
    a: "Pix, boleto bancário e cartão de crédito. No anual, 10% de desconto à vista por Pix ou boleto.",
  },
];

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-white dark:bg-neutral-950">
      <header className="border-b border-neutral-200 bg-white/80 backdrop-blur-sm dark:border-neutral-800 dark:bg-neutral-950/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="text-xl font-bold text-primary">
            Indica AÍ!
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            <Link href="/#funcionalidades" className="text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-400">
              Funcionalidades
            </Link>
            <Link href="/precos" className="text-sm font-medium text-neutral-900 dark:text-neutral-50">
              Preços
            </Link>
            <Link href="/#contato" className="text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-400">
              Contato
            </Link>
          </nav>
          <Link href="/login">
            <Button variant="ghost" size="sm">Entrar</Button>
          </Link>
        </div>
      </header>

      <section className="px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 sm:text-5xl">
            Preço fixo. Sem percentual sobre comissões.
          </h1>
          <p className="mt-6 text-lg text-neutral-600 dark:text-neutral-400">
            Você paga um valor previsível por mês. O dinheiro das indicações vai inteiro para seus parceiros — nada fica conosco no meio do caminho.
          </p>
        </div>
      </section>

      <section className="px-4 pb-20">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {tiers.map((tier) => (
            <article
              key={tier.name}
              className={`relative flex flex-col rounded-2xl border p-6 ${
                tier.highlighted
                  ? "border-primary bg-primary/5 shadow-lg"
                  : "border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"
              }`}
            >
              {tier.footnote && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-medium text-white">
                  {tier.footnote}
                </div>
              )}
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
                {tier.name}
              </h2>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-3xl font-bold text-neutral-900 dark:text-neutral-50">
                  {tier.price}
                </span>
                {tier.name !== "Trial" && (
                  <span className="text-sm text-neutral-500">/mês</span>
                )}
              </div>
              {tier.annualPrice && (
                <p className="mt-1 text-xs text-neutral-500">{tier.annualPrice}</p>
              )}
              <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">
                {tier.blurb}
              </p>
              <ul className="mt-6 flex flex-col gap-2 text-sm">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex gap-2 text-neutral-700 dark:text-neutral-300">
                    <span aria-hidden className="text-primary">✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Link href={tier.ctaHref} className="mt-6">
                <Button variant={tier.highlighted ? "default" : "outline"} className="w-full">
                  {tier.cta}
                </Button>
              </Link>
            </article>
          ))}
        </div>
        <p className="mx-auto mt-8 max-w-3xl text-center text-sm text-neutral-500">
          Todos os planos incluem: rastreamento por link único, suporte LGPD, detecção anti-fraude e atualizações contínuas.
          Valores em BRL. NFS-e emitida ao final do mês.
        </p>
      </section>

      <section className="border-t border-neutral-200 bg-neutral-50 px-4 py-20 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-3xl font-bold text-center text-neutral-900 dark:text-neutral-50">
            Perguntas frequentes
          </h2>
          <dl className="mt-12 space-y-6">
            {faqs.map((faq) => (
              <div key={faq.q} className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-950">
                <dt className="font-medium text-neutral-900 dark:text-neutral-50">{faq.q}</dt>
                <dd className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">{faq.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="px-4 py-16">
        <div className="mx-auto max-w-3xl rounded-2xl bg-primary/5 p-10 text-center">
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
            Pronto pra começar?
          </h2>
          <p className="mt-3 text-neutral-600 dark:text-neutral-400">
            14 dias grátis. Sem cartão. Configure seu primeiro programa em menos de 10 minutos.
          </p>
          <Link href="/register?plan=trial" className="mt-6 inline-block">
            <Button size="lg">Começar trial gratuito</Button>
          </Link>
        </div>
      </section>

      <footer className="border-t border-neutral-200 px-4 py-12 dark:border-neutral-800">
        <div className="mx-auto max-w-6xl text-center text-sm text-neutral-500">
          <p className="font-semibold text-neutral-900 dark:text-neutral-50">Indica AÍ!</p>
          <div className="mt-4 flex justify-center gap-6">
            <Link href="/termos" className="hover:text-neutral-700">Termos de Uso</Link>
            <Link href="/privacidade" className="hover:text-neutral-700">Privacidade</Link>
            <Link href="/lgpd/contact" className="hover:text-neutral-700">LGPD</Link>
            <a href="mailto:privacidade@indica.ai" className="hover:text-neutral-700">
              privacidade@indica.ai
            </a>
          </div>
        </div>
      </footer>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          }),
        }}
      />
    </main>
  );
}
