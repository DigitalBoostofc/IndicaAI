import { IndicacoesTable } from "./table";

export default function IndicacoesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
          Indicações
        </h1>
      </div>

      <IndicacoesTable />
    </div>
  );
}
