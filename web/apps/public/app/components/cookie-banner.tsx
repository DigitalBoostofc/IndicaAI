// Wireframe §4.3 — LGPD — Banner de Cookies
// Overlay inferior com checkboxes de consentimento

"use client";

import { useState, useEffect } from "react";
import { Button } from "@indica/ui";

const STORAGE_KEY = "indica_cookie_consent";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [analytics, setAnalytics] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      setVisible(true);
    }
  }, []);

  const handleAccept = (type: "essential" | "all") => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        essential: true,
        analytics: type === "all" ? true : analytics,
        timestamp: new Date().toISOString(),
      })
    );
    // TODO: registrar consentimento via POST /consents
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-neutral-200 bg-white p-4 shadow-lg dark:border-neutral-800 dark:bg-neutral-900 sm:p-6">
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-semibold">🍪 Este site usa cookies</p>
            <p className="mt-1 max-w-xl text-sm text-neutral-500">
              Usamos cookies essenciais para o funcionamento do site e cookies de análise
              para melhorar sua experiência.
            </p>
            <label className="mt-3 flex items-center gap-2">
              <input
                type="checkbox"
                checked={analytics}
                onChange={(e) => setAnalytics(e.target.checked)}
                className="rounded border-neutral-300"
              />
              <span className="text-sm text-neutral-600 dark:text-neutral-400">
                Cookies de análise (opcionais)
              </span>
            </label>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" size="sm" onClick={() => handleAccept("essential")}>
              Aceitar essenciais
            </Button>
            <Button size="sm" onClick={() => handleAccept("all")}>
              Aceitar todos
            </Button>
            <a
              href="/privacidade"
              className="flex items-center justify-center text-sm text-neutral-500 hover:text-neutral-700"
            >
              Saiba mais
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
