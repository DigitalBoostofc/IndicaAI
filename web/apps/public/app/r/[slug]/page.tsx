// Tracking fallback — quando Cloudflare Worker estiver indisponível
// Rota: /r/[slug] — ex: indica.ai/r/maria-x
// Esta rota faz o mesmo que o Worker: lê cookie _iaref, registra evento, redireciona
// TODO: implementar lógica de tracking no server component

import { redirect } from "next/navigation";

interface TrackingPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function TrackingPage({
  params,
  searchParams,
}: TrackingPageProps) {
  const { slug } = await params;
  const search = await searchParams;

  // TODO: implementar tracking fallback
  // 1. Ler cookie _iaref
  // 2. Registrar click event via POST /events/click
  // 3. Resolver destino do programa (WhatsApp, site, landing)
  // 4. Redirect 302

  // Por enquanto, redirect para landing do programa
  const utmParams = new URLSearchParams();
  for (const [key, value] of Object.entries(search)) {
    if (typeof value === "string") {
      utmParams.set(key, value);
    }
  }
  const queryString = utmParams.toString();
  const suffix = queryString ? `?${queryString}` : "";

  redirect(`/p/${slug}${suffix}`);
}
