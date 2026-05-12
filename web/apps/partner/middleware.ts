import { NextResponse, type NextRequest } from "next/server";

// Middleware placeholder — validação JWT do parceiro via cookie HttpOnly
// Auth é magic link → após validação, backend seta cookie HttpOnly

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rotas públicas
  const publicPaths = ["/login", "/register"];
  const isPublicPath = publicPaths.some((p) => pathname.startsWith(p));

  // TODO: verificar cookie HttpOnly "session"
  // const session = request.cookies.get("session");

  // if (!session && !isPublicPath) {
  //   return NextResponse.redirect(new URL("/login", request.url));
  // }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/).*)",
  ],
};
