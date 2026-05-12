"use client";

import { Bell, Search } from "lucide-react";
import { Input } from "@indica/ui";

export function Header() {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-neutral-200 bg-white px-4 dark:border-neutral-800 dark:bg-neutral-900 sm:px-6">
      {/* Busca — wireframe: [🔍 Buscar...] */}
      <div className="hidden w-full max-w-md md:block">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" aria-hidden="true" />
          <Input
            placeholder="Buscar..."
            className="pl-9"
            aria-label="Buscar"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Notificações — wireframe: [🔔] */}
        <button
          className="relative rounded-md p-2 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800"
          aria-label="Notificações"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-error" aria-hidden="true" />
        </button>

        {/* Avatar — wireframe: [Avatar ▾] */}
        <button
          className="flex items-center gap-2 rounded-md p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          aria-label="Menu do usuário"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-medium text-white">
            L
          </div>
        </button>
      </div>
    </header>
  );
}
