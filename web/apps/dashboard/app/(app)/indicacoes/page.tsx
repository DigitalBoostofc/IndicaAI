import { IndicacoesTable } from "./table";

export default function IndicacoesPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
            Indicações
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Gerencie todas as indicações recebidas pelos seus parceiros.
          </p>
        </div>
      </div>

      <IndicacoesTable />
    </div>
  );
}
