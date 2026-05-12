// Wireframe §4.3 — LGPD — Direitos do Titular
// Formulário para exercício de direitos LGPD

import { Button, Input } from "@indica/ui";

export default function LGPDContactPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="rounded-lg border border-neutral-200 bg-white p-8 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <h1 className="text-2xl font-bold">Seus dados pessoais</h1>

          <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">
            De acordo com a LGPD (Lei 13.709/2018), você tem direito a:
          </p>

          <ul className="mt-4 space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
            <li className="flex items-center gap-2">
              <span className="text-primary">•</span>
              Acessar seus dados
            </li>
            <li className="flex items-center gap-2">
              <span className="text-primary">•</span>
              Corrigir dados incorretos
            </li>
            <li className="flex items-center gap-2">
              <span className="text-primary">•</span>
              Solicitar a exclusão
            </li>
            <li className="flex items-center gap-2">
              <span className="text-primary">•</span>
              Exportar seus dados
            </li>
            <li className="flex items-center gap-2">
              <span className="text-primary">•</span>
              Revogar consentimentos
            </li>
          </ul>

          <form className="mt-8 space-y-4">
            <div>
              <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                E-mail
              </label>
              <Input type="email" className="mt-1" placeholder="seu@email.com" />
            </div>

            <div>
              <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Tipo de solicitação
              </label>
              <select className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800">
                <option>Selecione</option>
                <option>Acessar meus dados</option>
                <option>Corrigir meus dados</option>
                <option>Excluir minha conta</option>
                <option>Exportar meus dados</option>
                <option>Revogar consentimento</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Descrição
              </label>
              <textarea
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
                rows={3}
                placeholder="Descreva sua solicitação..."
              />
            </div>

            <Button type="submit" className="w-full">
              Enviar solicitação
            </Button>
          </form>

          <div className="mt-6 border-t border-neutral-200 pt-6 dark:border-neutral-800">
            <p className="text-sm text-neutral-500">
              Encarregado de Proteção de Dados (DPO):
            </p>
            <a
              href="mailto:privacidade@indica.ai"
              className="text-sm text-primary hover:underline"
            >
              privacidade@indica.ai
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
