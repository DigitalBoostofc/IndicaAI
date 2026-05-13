import type { ReactNode } from "react";
import { PartnerNav } from "@/components/partner-nav";
import { AuthGuard } from "@/components/auth-guard";
import { Toaster } from "@indica/ui";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex min-h-screen flex-col bg-neutral-50 dark:bg-neutral-950 lg:flex-row">
        <aside className="hidden w-64 border-r border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900 lg:block">
          <div className="flex h-16 items-center border-b border-neutral-200 px-4 dark:border-neutral-800">
            <span className="text-xl font-bold text-primary">Indica AÍ!</span>
          </div>
          <nav className="p-4">
            <PartnerNav orientation="vertical" />
          </nav>
        </aside>

        <header className="flex h-14 items-center justify-between border-b border-neutral-200 bg-white px-4 dark:border-neutral-800 dark:bg-neutral-900 lg:hidden">
          <span className="text-lg font-bold text-primary">Indica AÍ!</span>
        </header>

        <main className="flex-1 p-4 pb-20 sm:p-6 lg:p-8 lg:pb-8">{children}</main>

        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900 lg:hidden">
          <PartnerNav orientation="horizontal" />
        </nav>
        <Toaster />
      </div>
    </AuthGuard>
  );
}
