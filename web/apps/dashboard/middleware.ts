import { NextResponse, type NextRequest } from "next/server";

// Middleware placeholder — validação JWT via cookie HttpOnly + tenant injection
// O JWT é setado pelo backend Go (Set-Cookie) — aqui apenas validamos presença
// e injetamos o tenant_id no header para o API client usar

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rotas públicas que não precisam de auth
  const publicPaths = ["/login", "/register", "/forgot-password"];
  const isPublicPath = publicPaths.some((p) => pathname.startsWith(p));

  // TODO: verificar cookie HttpOnly "session" ou "access_token"
  // const session = request.cookies.get("session");

  // if (!session && !isPublicPath) {
  //   return NextResponse.redirect(new URL("/login", request.url));
  // }

  // TODO: decodificar JWT para extrair tenant_id e role
  // Injectar tenant_id no header para API client
  const response = NextResponse.next();
  // response.headers.set("x-tenant-id", tenantId);

  // Se é admin, permitir acesso ao route group (admin)
  // if (pathname.startsWith("/admin") && role !== "saas_admin") {
  //   return NextResponse.redirect(new URL("/dashboard", request.url));
  // }

  return response;
}

export const config = {
  matcher: [
    // Proteger todas as rotas exceto assets estáticos e api internas
    "/((?!_next/static|_next/image|favicon.ico|api/).*)",
  ],
};
