"use client";

import { useState } from "react";
import { Button, Input, toast } from "@indica/ui";
import { ParceirosTable } from "./table";
import { ConvidarParceiroSheet } from "./convidar-sheet";

export default function ParceirosPage() {
  const [showConvidar, setShowConvidar] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
          Parceiros
        </h1>
        <Button onClick={() => setShowConvidar(true)}>
          Cadastrar parceiro
        </Button>
      </div>

      <ParceirosTable />

      {showConvidar && (
        <ConvidarParceiroSheet onClose={() => setShowConvidar(false)} />
      )}
    </div>
  );
}
