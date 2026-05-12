import type { Metadata } from "next";
import "@indica/ui/styles/globals.css";
import { CookieBanner } from "./components/cookie-banner";

export const metadata: Metadata = {
  title: "Indica AÍ! — Programa de Indicação",
  description: "Transforme seus clientes em canais de venda rastreáveis",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
        <CookieBanner />
      </body>
    </html>
  );
}
