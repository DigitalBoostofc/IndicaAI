// CopyLinkButton — design-system.md §7.5
// Botão com feedback visual de cópia do link de indicação

"use client";

import { useState, useCallback } from "react";
import { cn } from "../lib/utils";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

interface CopyLinkButtonProps {
  url: string;
  className?: string;
}

export function CopyLinkButton({ url, className }: CopyLinkButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Fallback para navegadores antigos
      const textArea = document.createElement("textarea");
      textArea.value = url;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
    }

    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [url]);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative flex-1">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" aria-hidden="true">
          🔗
        </span>
        <Input
          readOnly
          value={url}
          className="pl-9 pr-3 text-sm"
          aria-label="Link de indicação"
          onClick={(e) => (e.target as HTMLInputElement).select()}
        />
      </div>
      <Button
        variant={copied ? "secondary" : "default"}
        size="sm"
        onClick={handleCopy}
        aria-label={copied ? "Link copiado" : "Copiar link de indicação"}
      >
        {copied ? "✓ Copiado!" : "Copiar"}
      </Button>
    </div>
  );
}
