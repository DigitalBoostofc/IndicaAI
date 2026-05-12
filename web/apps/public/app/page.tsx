// Wireframe §4.1 — Landing Page do SaaS
// Hero, como funciona (3 steps), para quem é, preços, CTA, footer

import { Button } from "@indica/ui";
import Link from "next/link";

export default function HomePage() {
  return (
    <main>
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-neutral-200 bg-white/80 backdrop-blur-sm dark:border-neutral-800 dark:bg-neutral-950/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <span className="text-xl font-bold text-primary">Indica AÍ!</span>
          <nav className="hidden items-center gap-6 md:flex">
            <a href="#funcionalidades" className="text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-400">
              Funcionalidades
            </a>
            <a href="#precos" className="text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-400">
              Preços
            </a>
            <a href="#contato" className="text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-400">
              Contato
            </a>
          </nav>
          <Link href="/login">
            <Button variant="ghost" size="sm">Entrar</Button>
          </Link>
        </div>
      </header>

      {/* Hero — wireframe: "Transforme seus clientes em canais de venda." */}
      <section className="px-4 py-20 text-center sm:py-32">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-4xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-50 sm:text-5xl">
            Transforme seus clientes
            <br />
            em canais de venda.
          </h1>
          <p className="mt-6 text-lg text-neutral-500">
            Crie programas de indicação, acompanhe resultados e pague comissões — tudo automático.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/register">
              <Button size="lg">Começar grátis</Button>
            </Link>
            <a href="#funcionalidades">
              <Button variant="outline" size="lg">Ver como funciona</Button>
            </a>
          </div>
        </div>
      </section>

      {/* Como funciona — wireframe: 3 steps */}
      <section id="funcionalidades" className="bg-neutral-50 px-4 py-20 dark:bg-neutral-900">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-3xl font-bold">Como funciona</h2>
          <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary-light text-2xl">
                1
              </div>
              <h3 className="mt-4 text-xl font-semibold">Crie seu programa</h3>
              <p className="mt-2 text-neutral-500">
                Configure regras de comissão em minutos. Sem complicação técnica.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary-light text-2xl">
                2
              </div>
              <h3 className="mt-4 text-xl font-semibold">Convide parceiros</h3>
              <p className="mt-2 text-neutral-500">
                Parceiros recebem links exclusivos e compartilham com seus contatos.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary-light text-2xl">
                3
              </div>
              <h3 className="mt-4 text-xl font-semibold">Venda mais</h3>
              <p className="mt-2 text-neutral-500">
                Acompanhe indicações, pague comissões e cresça com seus parceiros.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Para quem é */}
      <section className="px-4 py-20">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold">Para quem é</h2>
          <p className="mt-8 text-lg text-neutral-500">
            Óticas · Clínicas · Academias · Lojas · Imobiliárias · Escolas · Estéticas · Infoprodutores · Agências
          </p>
        </div>
      </section>

      {/* Preços — wireframe: Free | Starter | Pro */}
      <section id="precos" className="bg-neutral-50 px-4 py-20 dark:bg-neutral-900">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-3xl font-bold">Preços</h2>
          <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
            <PricingCard
              name="Free"
              price="R$ 0/mês"
              features={["1 programa", "3 parceiros", "Suporte e-mail"]}
              cta="Começar"
              ctaHref="/register"
            />
            <PricingCard
              name="Starter"
              price="R$ 97/mês"
              features={["5 programas", "50 parceiros", "Suporte chat"]}
              cta="Assinar"
              ctaHref="/register"
              highlighted
            />
            <PricingCard
              name="Pro"
              price="R$ 297/mês"
              features={["Ilimitado", "Ilimitado", "Suporte prioritário"]}
              cta="Fale conosco"
              ctaHref="#contato"
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-200 px-4 py-12 dark:border-neutral-800">
        <div className="mx-auto max-w-6xl text-center text-sm text-neutral-500">
          <p className="font-semibold text-neutral-900 dark:text-neutral-50">Indica AÍ!</p>
          <div className="mt-4 flex justify-center gap-6">
            <a href="/termos" className="hover:text-neutral-700">Termos de Uso</a>
            <a href="/privacidade" className="hover:text-neutral-700">Privacidade</a>
            <a href="/lgpd/contact" className="hover:text-neutral-700">LGPD</a>
            <a href="mailto:privacidade@indica.ai" className="hover:text-neutral-700">privacidade@indica.ai</a>
          </div>
        </div>
      </footer>
    </main>
  );
}

function PricingCard({
  name,
  price,
  features,
  cta,
  ctaHref,
  highlighted,
}: {
  name: string;
  price: string;
  features: string[];
  cta: string;
  ctaHref: string;
  highlighted?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-8 ${
        highlighted
          ? "border-primary shadow-lg ring-2 ring-primary"
          : "border-neutral-200 dark:border-neutral-800"
      } bg-white dark:bg-neutral-900`}
    >
      <h3 className="text-xl font-bold">{name}</h3>
      <p className="mt-4 text-3xl font-extrabold">{price}</p>
      <ul className="mt-6 space-y-3">
        {features.map((f) => (
          <li key={f} className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
            <span className="text-success">✓</span>
            {f}
          </li>
        ))}
      </ul>
      <Link href={ctaHref}>
        <Button
          className="mt-8 w-full"
          variant={highlighted ? "default" : "outline"}
        >
          {cta}
        </Button>
      </Link>
    </div>
  );
}
