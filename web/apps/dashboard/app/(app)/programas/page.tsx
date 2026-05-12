// Wireframe §1.3 — Lista de Programas
// Cards por programa com status, métricas, link, ações (editar, pausar, arquivar)

import { Badge, Button, CopyLinkButton } from "@indica/ui";
import Link from "next/link";

// Dados mock — futuramente virão do TanStack Query
const mockProgramas = [
  {
    id: "1",
    nome: "Programa de Indicação Wenox",
    status: "active" as const,
    parceiros: 3,
    cliques: 145,
    comissao: 2400,
    regra: "Split 20% comissão/desconto",
    link: "indica.ai/r/wenox-abc123",
  },
  {
    id: "2",
    nome: "Ótica Premium — Indique e Ganhe",
    status: "active" as const,
    parceiros: 8,
    cliques: 312,
    comissao: 800,
    regra: "R$100 por venda confirmada (Pix)",
    link: "indica.ai/r/otica-prem-xyz789",
  },
];

const formatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default function ProgramasPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
          Programas
        </h1>
        <Link href="/programas/novo">
          <Button>+ Novo programa</Button>
        </Link>
      </div>

      <div className="space-y-4">
        {mockProgramas.map((prog) => (
          <div
            key={prog.id}
            className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold">{prog.nome}</h2>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-neutral-500">
                  <Badge variant={prog.status === "active" ? "success" : "warning"}>
                    {prog.status === "active" ? "Ativo" : "Pausado"}
                  </Badge>
                  <span>{prog.parceiros} parceiros</span>
                  <span>{prog.cliques} cliques</span>
                  <span>{formatter.format(prog.comissao)}</span>
                </div>
                <p className="mt-2 text-sm text-neutral-500">Regra: {prog.regra}</p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <CopyLinkButton url={`https://${prog.link}`} />
              <div className="flex gap-2">
                <Link href={`/programas/${prog.id}`}>
                  <Button variant="ghost" size="sm">Editar</Button>
                </Link>
                <Button variant="ghost" size="sm">···</Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
