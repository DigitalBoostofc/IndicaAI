"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { Shield, AlertTriangle, ShieldAlert, ShieldCheck, ChevronRight } from "lucide-react";
import {
  StatCard,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Badge,
  cn,
} from "@indica/ui";
import {
  auditApi,
  type AuditEntry,
  type AuditSummary,
  type FraudEvaluation,
  ApiError,
} from "../../lib/api";

const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

type Tab = "events" | "fraud";

const fraudActionConfig: Record<
  FraudEvaluation["action"],
  { label: string; variant: "success" | "warning" | "destructive" }
> = {
  ok: { label: "Aprovado", variant: "success" },
  review: { label: "Revisar", variant: "warning" },
  block: { label: "Bloqueado", variant: "destructive" },
};

export default function AuditoriaPage() {
  const [tab, setTab] = useState<Tab>("events");
  const [summary, setSummary] = useState<AuditSummary | null>(null);
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [fraud, setFraud] = useState<FraudEvaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function reload() {
    setLoading(true);
    Promise.all([
      auditApi.summary(),
      auditApi.list({ limit: 100 }),
      auditApi.fraudEvaluations({ limit: 100 }),
    ])
      .then(([s, e, f]) => {
        setSummary(s);
        setEntries(e || []);
        setFraud(f || []);
      })
      .catch((e: ApiError) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    reload();
  }, []);

  const fraudCount = useMemo(
    () => (summary?.fraud_review ?? 0) + (summary?.fraud_block ?? 0),
    [summary],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
            Auditoria
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Toda ação sensível no seu tenant fica registrada aqui. Filtre por tipo
            ou revise decisões de antifraude.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Eventos (30 dias)"
          value={String(summary?.entries_last_30_days ?? 0)}
        />
        <StatCard
          label="Aprovados (fraude)"
          value={String(summary?.fraud_ok ?? 0)}
        />
        <StatCard
          label="Em revisão"
          value={String(summary?.fraud_review ?? 0)}
        />
        <StatCard
          label="Bloqueados"
          value={String(summary?.fraud_block ?? 0)}
        />
      </div>

      {error && (
        <div className="rounded-lg border border-error/30 bg-error/5 p-4 text-sm text-error">
          {error}
        </div>
      )}

      <div className="flex gap-2 border-b border-neutral-200 dark:border-neutral-800">
        <button
          type="button"
          onClick={() => setTab("events")}
          className={cn(
            "border-b-2 px-4 py-2 text-sm font-medium transition-colors",
            tab === "events"
              ? "border-primary text-primary"
              : "border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100",
          )}
        >
          <Shield className="mr-2 inline h-4 w-4" />
          Eventos ({entries.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("fraud")}
          className={cn(
            "border-b-2 px-4 py-2 text-sm font-medium transition-colors",
            tab === "fraud"
              ? "border-primary text-primary"
              : "border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100",
          )}
        >
          <AlertTriangle className="mr-2 inline h-4 w-4" />
          Antifraude {fraudCount > 0 && <span className="text-warning">({fraudCount})</span>}
        </button>
      </div>

      {loading ? (
        <p className="px-4 py-8 text-center text-sm text-neutral-500">Carregando...</p>
      ) : tab === "events" ? (
        <EventsTable
          entries={entries}
          expandedId={expandedId}
          onToggle={(id) => setExpandedId(expandedId === id ? null : id)}
        />
      ) : (
        <FraudTable
          fraud={fraud}
          expandedId={expandedId}
          onToggle={(id) => setExpandedId(expandedId === id ? null : id)}
        />
      )}
    </div>
  );
}

function EventsTable({
  entries,
  expandedId,
  onToggle,
}: {
  entries: AuditEntry[];
  expandedId: string | null;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-6"></TableHead>
            <TableHead>Quando</TableHead>
            <TableHead>Quem</TableHead>
            <TableHead>Ação</TableHead>
            <TableHead>Entidade</TableHead>
            <TableHead>IP</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((e) => {
            const expanded = expandedId === e.id;
            return (
              <Fragment key={e.id}>
                <TableRow
                  onClick={() => onToggle(e.id)}
                  className="cursor-pointer hover:bg-neutral-50/60 dark:hover:bg-neutral-800/50"
                >
                  <TableCell>
                    <ChevronRight
                      className={cn(
                        "h-4 w-4 text-neutral-400 transition-transform",
                        expanded && "rotate-90",
                      )}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-xs text-neutral-500">
                    {dateTimeFormatter.format(new Date(e.created_at))}
                  </TableCell>
                  <TableCell className="text-sm">
                    {e.user_email ?? <span className="text-neutral-400">sistema</span>}
                  </TableCell>
                  <TableCell>
                    <Badge variant="default">{e.action}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-neutral-500">
                    {e.entity_type}
                    {e.entity_id && (
                      <span className="ml-1 font-mono text-xs text-neutral-400">
                        ({e.entity_id.slice(0, 8)})
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-neutral-500">
                    {e.ip_address || "—"}
                  </TableCell>
                </TableRow>
                {expanded && (
                  <TableRow>
                    <TableCell colSpan={6} className="bg-neutral-50/50 dark:bg-neutral-950/50">
                      <DetailGrid entry={e} />
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            );
          })}
          {entries.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="py-10 text-center text-neutral-500">
                Nenhum evento ainda. Ações como aprovar comissão, criar parceiro,
                marcar pago etc. aparecem aqui automaticamente.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function DetailGrid({ entry }: { entry: AuditEntry }) {
  const blocks: { label: string; value: unknown }[] = [];
  if (entry.user_agent) blocks.push({ label: "User-Agent", value: entry.user_agent });
  if (entry.old_values && entry.old_values !== null)
    blocks.push({ label: "Antes", value: entry.old_values });
  if (entry.new_values && entry.new_values !== null)
    blocks.push({ label: "Depois", value: entry.new_values });
  if (entry.metadata && Object.keys(entry.metadata as object).length > 0)
    blocks.push({ label: "Metadata", value: entry.metadata });

  if (blocks.length === 0) {
    return (
      <p className="px-4 py-3 text-sm text-neutral-500">Sem detalhes adicionais.</p>
    );
  }

  return (
    <div className="grid gap-3 p-4 sm:grid-cols-2">
      {blocks.map((b) => (
        <div key={b.label} className="rounded-md border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            {b.label}
          </p>
          <pre className="mt-2 overflow-x-auto text-xs text-neutral-700 dark:text-neutral-300">
            {typeof b.value === "string" ? b.value : JSON.stringify(b.value, null, 2)}
          </pre>
        </div>
      ))}
    </div>
  );
}

function FraudTable({
  fraud,
  expandedId,
  onToggle,
}: {
  fraud: FraudEvaluation[];
  expandedId: string | null;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-6"></TableHead>
            <TableHead>Quando</TableHead>
            <TableHead>Parceiro</TableHead>
            <TableHead className="text-right">Score</TableHead>
            <TableHead>Decisão</TableHead>
            <TableHead>Sinais</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {fraud.map((f) => {
            const expanded = expandedId === f.id;
            const cfg = fraudActionConfig[f.action];
            return (
              <Fragment key={f.id}>
                <TableRow
                  onClick={() => onToggle(f.id)}
                  className="cursor-pointer hover:bg-neutral-50/60 dark:hover:bg-neutral-800/50"
                >
                  <TableCell>
                    <ChevronRight
                      className={cn(
                        "h-4 w-4 text-neutral-400 transition-transform",
                        expanded && "rotate-90",
                      )}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-xs text-neutral-500">
                    {dateTimeFormatter.format(new Date(f.created_at))}
                  </TableCell>
                  <TableCell className="font-medium text-neutral-900 dark:text-neutral-50">
                    {f.partner_name}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {f.score > 0 ? (
                      <span
                        className={cn(
                          "font-bold",
                          f.score >= 61
                            ? "text-error"
                            : f.score >= 31
                            ? "text-warning"
                            : "text-neutral-500",
                        )}
                      >
                        {f.score}
                      </span>
                    ) : (
                      <span className="text-neutral-400">0</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={cfg.variant}>
                      {f.action === "ok" && <ShieldCheck className="mr-1 inline h-3 w-3" />}
                      {f.action === "review" && <AlertTriangle className="mr-1 inline h-3 w-3" />}
                      {f.action === "block" && <ShieldAlert className="mr-1 inline h-3 w-3" />}
                      {cfg.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-neutral-500">
                    {f.signals.length > 0 ? (
                      <span className="font-mono text-xs">
                        {f.signals.map((s) => s.name).join(", ")}
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                </TableRow>
                {expanded && (
                  <TableRow>
                    <TableCell colSpan={6} className="bg-neutral-50/50 dark:bg-neutral-950/50">
                      <FraudDetail evaluation={f} />
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            );
          })}
          {fraud.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="py-10 text-center text-neutral-500">
                Nenhuma decisão de antifraude ainda. As checagens rodam toda vez
                que um parceiro cadastra um lead.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function FraudDetail({ evaluation }: { evaluation: FraudEvaluation }) {
  return (
    <div className="space-y-3 p-4">
      {evaluation.signals.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Sinais disparados
          </p>
          <ul className="space-y-2">
            {evaluation.signals.map((s) => (
              <li
                key={s.name}
                className="flex items-start justify-between gap-3 rounded-md border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900"
              >
                <div>
                  <p className="font-mono text-sm font-semibold">{s.name}</p>
                  {s.evidence && (
                    <pre className="mt-1 text-xs text-neutral-500">
                      {JSON.stringify(s.evidence, null, 2)}
                    </pre>
                  )}
                </div>
                <span className="font-mono text-sm font-bold text-warning">+{s.points}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Evidência completa
        </p>
        <pre className="overflow-x-auto rounded-md border border-neutral-200 bg-white p-3 text-xs text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
          {JSON.stringify(evaluation.evidence, null, 2)}
        </pre>
      </div>
    </div>
  );
}
