import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  // Обновляем сессию
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Если пользователь не авторизован и пытается попасть на защищенные страницы
  if (!session && req.nextUrl.pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/", req.url))
  }

  // Если пользователь авторизован и пытается попасть на страницу входа
  if (session && req.nextUrl.pathname === "/auth") {
    return NextResponse.redirect(new URL("/", req.url))
  }

  return res
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
}
