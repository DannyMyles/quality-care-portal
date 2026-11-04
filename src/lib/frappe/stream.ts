import { cookies } from "next/headers"
import { NextResponse, type NextRequest } from "next/server"
import { openSession, SESSION_COOKIE } from "@/lib/auth/session"
import { API_BASE, siteHeaders } from "@/lib/frappe/config"

/** Pass a file from the API through to the browser, signed in as this person. */
export async function streamFile(request: NextRequest, endpoint: string, params: Record<string, string>, contentType: string, disposition: string) {
  const session = await openSession((await cookies()).get(SESSION_COOKIE)?.value)
  if (!session) return NextResponse.redirect(new URL("/session/end", request.url))
  const url = new URL(`${API_BASE}.${endpoint}`)
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
  const response = await fetch(url, { cache: "no-store", headers: { ...siteHeaders, Authorization: `Bearer ${session.accessToken}` } })
  if (!response.ok) return new NextResponse("This file could not be opened.", { status: response.status })
  return new NextResponse(response.body, { headers: { "Content-Type": contentType, "Content-Disposition": disposition } })
}
