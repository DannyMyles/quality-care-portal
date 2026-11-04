import { NextResponse, type NextRequest } from "next/server"
import { api } from "@/lib/frappe/client"
import { FRAPPE_PUBLIC_URL } from "@/lib/frappe/config"

/** Open Desk already signed in, by way of a one-time key that lasts a minute. */
export async function GET(request: NextRequest) {
  const to = request.nextUrl.searchParams.get("to") ?? undefined
  const { key } = await api<{ key: string }>("desk_link", { body: { to } })
  const target = new URL(`${FRAPPE_PUBLIC_URL}/api/method/quality_care.api.v1.open_desk`)
  target.searchParams.set("key", key)
  return NextResponse.redirect(target)
}
