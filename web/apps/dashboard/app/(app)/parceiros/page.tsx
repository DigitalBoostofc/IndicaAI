"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@indica/ui";
import { ParceirosTable } from "./table";
import { ConvidarParceiroSheet } from "./convidar-sheet";

export default function ParceirosPage() {
  const [showConvidar, setShowConvidar] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
            Parceiros
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Cadastre e acompanhe quem está trazendo indicações pra você.
          </p>
        </div>
        <Button onClick={() => setShowConvidar(true)} className="gap-1.5">
          <Plus className="h-4 w-4" />
          Novo parceiro
        </Button>
      </div>

      <ParceirosTable key={reloadKey} />

      {showConvidar && (
        <ConvidarParceiroSheet
          onClose={() => setShowConvidar(false)}
          onCreated={() => setReloadKey((k) => k + 1)}
        />
      )}
    </div>
  );
}
