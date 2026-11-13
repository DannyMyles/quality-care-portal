import { cookies } from "next/headers"
import { NextResponse, type NextRequest } from "next/server"
import { openSession, SESSION_COOKIE } from "@/lib/auth/session"
import { COMPANY_COOKIE } from "@/lib/frappe/client"
import { API_BASE, siteHeaders } from "@/lib/frappe/config"

/** Pass a file from the API through to the browser, signed in as this person. */
export async function streamFile(request: NextRequest, endpoint: string, params: Record<string, string>, contentType: string, disposition: string) {
  const jar = await cookies()
  const session = await openSession(jar.get(SESSION_COOKIE)?.value)
  // Reports and statements print for the company being worked in, as they show on screen.
  const company = jar.get(COMPANY_COOKIE)?.value
  if (!session) return NextResponse.redirect(new URL("/session/end", request.url))
  const url = new URL(`${API_BASE}.${endpoint}`)
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
  const response = await fetch(url, { cache: "no-store", headers: { ...siteHeaders, Authorization: `Bearer ${session.accessToken}`, ...(company ? { "X-QC-Company": company } : {}) } })
  if (!response.ok) return new NextResponse("This file could not be opened.", { status: response.status })
  return new NextResponse(response.body, { headers: { "Content-Type": contentType, "Content-Disposition": disposition } })
}
