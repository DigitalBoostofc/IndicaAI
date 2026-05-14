import Link from "next/link";
import type { ReactNode } from "react";

interface LegalPageProps {
  title: string;
  version: string;
  effectiveDate: string;
  children: ReactNode;
}

// Shared chrome for the long-form legal pages (/termos, /privacidade).
// Keeps typography, header and footer consistent so a user opening either
// doc sees the same brand surface — Tailwind prose utilities give us the
// long-form rhythm without dragging in a markdown runtime.
export function LegalPage({ title, version, effectiveDate, children }: LegalPageProps) {
  return (
    <main className="min-h-screen bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      <header className="border-b border-neutral-200 px-4 py-6 dark:border-neutral-800">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link href="/" className="text-lg font-bold">
            Indica AÍ!
          </Link>
          <nav className="flex gap-4 text-sm text-neutral-500">
            <Link href="/termos" className="hover:text-neutral-700 dark:hover:text-neutral-200">
              Termos
            </Link>
            <Link href="/privacidade" className="hover:text-neutral-700 dark:hover:text-neutral-200">
              Privacidade
            </Link>
            <Link href="/lgpd/contact" className="hover:text-neutral-700 dark:hover:text-neutral-200">
              LGPD
            </Link>
          </nav>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-4 py-12">
        <header className="mb-10 border-b border-neutral-200 pb-6 dark:border-neutral-800">
          <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">{title}</h1>
          <p className="mt-3 text-sm text-neutral-500">
            Versão <span className="font-medium text-neutral-700 dark:text-neutral-300">{version}</span> · em
            vigor desde <span className="font-medium text-neutral-700 dark:text-neutral-300">{effectiveDate}</span>
          </p>
        </header>

        <div className="space-y-6 text-[15px] leading-relaxed text-neutral-700 dark:text-neutral-300 [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-neutral-900 [&_h2]:dark:text-neutral-50 [&_h3]:mt-6 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-neutral-900 [&_h3]:dark:text-neutral-100 [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_strong]:text-neutral-900 [&_strong]:dark:text-neutral-100 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-1 [&_table]:my-6 [&_table]:w-full [&_table]:border-collapse [&_table]:text-sm [&_th]:border [&_th]:border-neutral-200 [&_th]:bg-neutral-50 [&_th]:p-2 [&_th]:text-left [&_th]:font-semibold [&_th]:dark:border-neutral-800 [&_th]:dark:bg-neutral-900 [&_td]:border [&_td]:border-neutral-200 [&_td]:p-2 [&_td]:dark:border-neutral-800 [&_code]:rounded [&_code]:bg-neutral-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[13px] [&_code]:dark:bg-neutral-800">
          {children}
        </div>
      </article>

      <footer className="border-t border-neutral-200 px-4 py-12 dark:border-neutral-800">
        <div className="mx-auto max-w-3xl text-center text-sm text-neutral-500">
          <p>
            Dúvidas? Escreva para{" "}
            <a href="mailto:privacidade@indica.ai" className="text-primary hover:underline">
              privacidade@indica.ai
            </a>
          </p>
          <p className="mt-4">
            <Link href="/" className="hover:text-neutral-700 dark:hover:text-neutral-200">
              ← voltar para a página inicial
            </Link>
          </p>
        </div>
      </footer>
    </main>
  );
}
