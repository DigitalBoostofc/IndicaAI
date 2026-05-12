// Wireframe §4.2 — Landing de Programa por Tenant
// Logo do programa, CTA para participar, link para parceiro existente

import { Button } from "@indica/ui";
import Link from "next/link";

interface ProgramPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ProgramPageProps) {
  const { slug } = await params;
  return {
    title: `Programa de Indicação — ${slug}`,
    description: "Indique amigos e ganhe benefícios!",
  };
}

export default async function ProgramPage({ params }: ProgramPageProps) {
  const { slug } = await params;

  // TODO: buscar dados do programa via API (server component)
  // const program = await apiClient.getProgramBySlug(slug);

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-lg">
        <div className="rounded-lg border border-neutral-200 bg-white p-8 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          {/* Logo placeholder */}
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-light text-2xl font-bold text-primary">
              {slug.charAt(0).toUpperCase()}
            </div>
          </div>

          <h1 className="mt-6 text-center text-3xl font-bold">
            Programa de Indicação
          </h1>
          <p className="mt-2 text-center text-lg text-neutral-500">
            {slug}
          </p>

          <p className="mt-6 text-center text-neutral-600 dark:text-neutral-400">
            Indique amigos e ganhe benefícios!
          </p>

          {/* Como funciona */}
          <div className="mt-8 space-y-4">
            <div className="flex items-start gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-light text-sm font-bold text-primary">
                1
              </span>
              <div>
                <p className="font-medium">Compartilhe seu link exclusivo</p>
                <p className="text-sm text-neutral-500">Envie para amigos e familiares</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-light text-sm font-bold text-primary">
                2
              </span>
              <div>
                <p className="font-medium">Seu amigo realiza uma compra</p>
                <p className="text-sm text-neutral-500">A indicação é registrada automaticamente</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-light text-sm font-bold text-primary">
                3
              </span>
              <div>
                <p className="font-medium">Você recebe sua comissão no Pix</p>
                <p className="text-sm text-neutral-500">Rápido e sem burocracia</p>
              </div>
            </div>
          </div>

          {/* CTAs */}
          <div className="mt-8 space-y-3">
            <Button className="w-full" size="lg">
              Quero participar
            </Button>
            <Link href="/parceiro/login">
              <Button variant="outline" className="w-full" size="lg">
                Já sou parceiro — acessar meu painel
              </Button>
            </Link>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-neutral-400">
          Powered by{" "}
          <a href="https://indica.ai" className="text-primary hover:underline">
            Indica AÍ!
          </a>{" "}
          ·{" "}
          <a href="/termos" className="hover:text-neutral-600">Termos</a>{" "}
          ·{" "}
          <a href="/privacidade" className="hover:text-neutral-600">Privacidade</a>
        </p>
      </div>
    </main>
  );
}
