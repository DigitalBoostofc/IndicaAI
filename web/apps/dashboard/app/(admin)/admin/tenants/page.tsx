"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Badge,
  Button,
  Input,
  toast,
} from "@indica/ui";
import { mockTenants, type MockTenant } from "@indica/api-client/mocks";

const formatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const statusVariant: Record<
  MockTenant["status"],
  "success" | "warning" | "destructive"
> = {
  active: "success",
  trial: "warning",
  suspended: "destructive",
};

const statusLabel: Record<string, string> = {
  active: "Ativo",
  trial: "Trial",
  suspended: "Suspenso",
};

export default function AdminTenantsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = mockTenants.filter((t) => {
    const matchesSearch = t.nome
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  function handleImpersonate(tenant: MockTenant) {
    toast({
      title: "Impersonate simulado",
      description: `Acessando como ${tenant.nome}...`,
      variant: "default",
    });
  }

  function handleSuspend(tenant: MockTenant) {
    toast({
      title: "Ação simulada",
      description: `Tenant ${tenant.nome} suspenso.`,
      variant: "warning",
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
          Empresas
        </h1>
        <Button
          onClick={() =>
            toast({
              title: "Convite simulado",
              description: "Formulário de convite será aberto.",
            })
          }
        >
          Convidar tenant
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-full max-w-xs">
          <Input
            placeholder="Buscar por nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">Status: Todos</option>
          <option value="active">Ativo</option>
          <option value="trial">Trial</option>
          <option value="suspended">Suspenso</option>
        </select>
      </div>

      {/* Tabela */}
      <div className="rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Plano</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Parceiros</TableHead>
              <TableHead className="text-right">MRR</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">
                  <div>
                    <p>{t.nome}</p>
                    <p className="text-xs text-neutral-500">
                      {t.subdominio}.indica.ai
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{t.plano}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={statusVariant[t.status]}>
                    {statusLabel[t.status]}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">{t.parceiros}</TableCell>
                <TableCell className="text-right">
                  {formatter.format(t.mrr)}
                </TableCell>
                <TableCell className="text-neutral-500">
                  {t.criadoEm}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleImpersonate(t)}
                    >
                      Acessar
                    </Button>
                    {t.status !== "suspended" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSuspend(t)}
                        className="text-warning"
                      >
                        Suspender
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-8 text-center text-neutral-500"
                >
                  Nenhum tenant encontrado com os filtros aplicados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <div className="flex items-center justify-between border-t border-neutral-200 px-4 py-3 dark:border-neutral-800">
          <p className="text-sm text-neutral-500">
            Mostrando 1-{filtered.length} de {filtered.length}
          </p>
        </div>
      </div>
    </div>
  );
}
