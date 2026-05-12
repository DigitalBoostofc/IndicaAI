import type { Metadata } from "next";
import { QueryProvider } from "@/components/providers/query-provider";
import "@indica/ui/styles/globals.css";

export const metadata: Metadata = {
  title: "Indica AÍ! — Dashboard",
  description: "Painel de gestão de programas de indicação",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
