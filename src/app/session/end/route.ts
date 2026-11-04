import { NextResponse, type NextRequest } from "next/server"
import { SESSION_COOKIE } from "@/lib/auth/session"

/** Sessions that have ended land here, because a page cannot clear a cookie while it renders. */
export function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/login?expired=1", request.url))
  response.cookies.delete(SESSION_COOKIE)
  return response
}
