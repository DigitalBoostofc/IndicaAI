"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@indica/ui";
import {
  LayoutDashboard,
  Megaphone,
  Users,
  FileText,
  DollarSign,
  Banknote,
  Settings,
  Menu,
  X,
  LogOut,
} from "lucide-react";
import { useEffect, useState } from "react";
import { authApi, type Me } from "../lib/api";

const navigation = [
  { name: "Visão geral", href: "/dashboard", icon: LayoutDashboard },
  { name: "Programas", href: "/programas", icon: Megaphone },
  { name: "Parceiros", href: "/parceiros", icon: Users },
  { name: "Indicações", href: "/indicacoes", icon: FileText },
  { name: "Comissões", href: "/comissoes", icon: DollarSign },
  { name: "Saques", href: "/saques", icon: Banknote },
];

const bottomNavigation = [
  { name: "Configurações", href: "/configuracoes", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [me, setMe] = useState<Me | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    authApi.me().then(setMe).catch(() => setMe(null));
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await authApi.logout();
    } catch {
      // ignore — proceed with redirect anyway
    }
    router.push("/login");
  }

  const tenantInitial =
    me?.tenant_name?.charAt(0).toUpperCase() ||
    me?.name?.charAt(0).toUpperCase() ||
    "?";

  const navContent = (
    <>
      <div className="flex h-16 items-center gap-2 border-b border-neutral-200 px-4 dark:border-neutral-800">
        <span className="text-xl font-bold text-primary">Indica AÍ!</span>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-4">
        {navigation.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname === item.href || pathname.startsWith(item.href + "/");
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
              onClick={() => setMobileOpen(false)}
            >
              <item.icon className="h-5 w-5" aria-hidden="true" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-neutral-200 p-4 dark:border-neutral-800">
        {bottomNavigation.map((item) => {
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
              onClick={() => setMobileOpen(false)}
            >
              <item.icon className="h-5 w-5" aria-hidden="true" />
              {item.name}
            </Link>
          );
        })}

        {/* User / Tenant card + logout */}
        <div className="mt-4 rounded-md border border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-2 px-3 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-light text-sm font-bold text-primary">
              {tenantInitial}
            </div>
            <div className="flex-1 truncate">
              <p className="text-sm font-medium truncate">
                {me?.tenant_name || "—"}
              </p>
              <p className="text-xs text-neutral-500 truncate">
                {me?.email || ""}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex w-full items-center gap-2 border-t border-neutral-200 px-3 py-2 text-left text-sm text-neutral-600 transition-colors hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-800"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            {loggingOut ? "Saindo..." : "Sair"}
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        className="fixed left-4 top-4 z-50 rounded-md p-2 text-neutral-600 hover:bg-neutral-100 lg:hidden"
        onClick={() => setMobileOpen(true)}
        aria-label="Abrir menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 transform bg-white transition-transform dark:bg-neutral-900 lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <button
          className="absolute right-4 top-4 rounded-md p-1 text-neutral-500 hover:bg-neutral-100"
          onClick={() => setMobileOpen(false)}
          aria-label="Fechar menu"
        >
          <X className="h-5 w-5" />
        </button>
        {navContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900 lg:block">
        {navContent}
      </aside>
    </>
  );
}
