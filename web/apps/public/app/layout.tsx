import type { Metadata } from "next";
import "@indica/ui/styles/globals.css";
import { CookieBanner } from "./components/cookie-banner";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://indica.ai";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Indica AÍ! — Programa de indicação com Pix, regras configuráveis e rastreio real",
    template: "%s · Indica AÍ!",
  },
  description:
    "Plataforma brasileira de programa de indicação. Configure regras, pague seus parceiros via Pix e rastreie cada venda — sem planilha, sem perder atribuição no WhatsApp.",
  keywords: [
    "programa de indicação",
    "marketing de indicação",
    "sistema de comissão",
    "indicação Pix",
    "programa de afiliados Brasil",
    "indique e ganhe",
    "rastreamento de indicação",
  ],
  authors: [{ name: "Indica AÍ!" }],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: SITE_URL,
    siteName: "Indica AÍ!",
    title: "Indica AÍ! — Programa de indicação com Pix e rastreio real",
    description:
      "Configure regras, pague parceiros via Pix e rastreie cada indicação. Plataforma 100% brasileira para SMBs.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Indica AÍ! — Programa de indicação",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Indica AÍ! — Programa de indicação com Pix",
    description:
      "Configure regras, pague parceiros via Pix e rastreie cada indicação.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-snippet": -1, "max-image-preview": "large" },
  },
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
