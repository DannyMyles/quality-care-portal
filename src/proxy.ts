import { NextResponse, type NextRequest } from "next/server"
import {
  cookieOptions,
  openSession,
  sealSession,
  SESSION_COOKIE,
  toSession,
  type SessionTokens,
  type TokenResponse,
} from "@/lib/auth/session"
import { API_BASE, siteHeaders } from "@/lib/frappe/config"

const REFRESH_MARGIN_MS = 2 * 60 * 1000
const SHARE_REFRESH_MS = 30 * 1000
const PUBLIC_PATHS = ["/login", "/session/end", "/forgot-password", "/reset-password", "/verify/", "/pay/"]

/**
 * A refresh token works once, and one page load can send several requests at the same moment,
 * so requests holding the same token share one refresh result for a short while.
 */
const refreshes = new Map<string, { at: number; result: Promise<SessionTokens | null> }>()

function refresh(session: SessionTokens) {
  const now = Date.now()
  for (const [key, entry] of refreshes) {
    if (now - entry.at > SHARE_REFRESH_MS) refreshes.delete(key)
  }
  const existing = refreshes.get(session.refreshToken)
  if (existing) return existing.result
  const result = fetch(`${API_BASE}.refresh`, {
    method: "POST",
    cache: "no-store",
    headers: { ...siteHeaders, "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: session.refreshToken }),
  })
    .then(async (response) => {
      if (!response.ok) return null
      const json = (await response.json()) as { tokens?: TokenResponse }
      return json.tokens ? toSession(json.tokens) : null
    })
    .catch(() => null)
  refreshes.set(session.refreshToken, { at: now, result })
  return result
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const isPublic = PUBLIC_PATHS.some((path) => pathname.startsWith(path))
  let session = await openSession(request.cookies.get(SESSION_COOKIE)?.value)

  if (!session) {
    if (isPublic) return NextResponse.next()
    const login = new URL("/login", request.url)
    if (pathname !== "/") login.searchParams.set("next", pathname + search)
    return NextResponse.redirect(login)
  }
  if (pathname.startsWith("/session/end") || pathname.startsWith("/reset-password") || pathname.startsWith("/forgot-password") || pathname.startsWith("/verify/") || pathname.startsWith("/pay/")) return NextResponse.next()
  if (pathname.startsWith("/login")) return NextResponse.redirect(new URL("/dashboard", request.url))

  if (session.expiresAt - Date.now() >= REFRESH_MARGIN_MS) return NextResponse.next()

  session = await refresh(session)
  if (!session) return NextResponse.redirect(new URL("/session/end", request.url))

  // Rendering reads cookies from the request, so pass the new one along as well as saving it.
  const sealed = await sealSession(session)
  request.cookies.set(SESSION_COOKIE, sealed)
  const headers = new Headers(request.headers)
  headers.set("cookie", request.cookies.toString())
  const response = NextResponse.next({ request: { headers } })
  response.cookies.set(SESSION_COOKIE, sealed, cookieOptions())
  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)"],
}
