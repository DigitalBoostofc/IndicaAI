"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@indica/ui";
import { LayoutDashboard, FileText, DollarSign, Settings } from "lucide-react";

const items = [
  { label: "Painel", href: "/parceiro", icon: LayoutDashboard },
  { label: "Indicações", href: "/parceiro/indicacoes", icon: FileText },
  { label: "Extrato", href: "/parceiro/extrato", icon: DollarSign },
  { label: "Config", href: "/parceiro/configuracoes", icon: Settings },
];

interface PartnerNavProps {
  orientation: "vertical" | "horizontal";
}

export function PartnerNav({ orientation }: PartnerNavProps) {
  const pathname = usePathname();

  if (orientation === "horizontal") {
    return (
      <div className="flex items-center justify-around py-2">
        {items.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-1 text-xs",
                isActive ? "text-primary" : "text-neutral-500"
              )}
            >
              <item.icon className="h-5 w-5" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {items.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary-light text-primary"
                : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800"
            )}
          >
            <item.icon className="h-5 w-5" aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
