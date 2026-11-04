import { cookies } from "next/headers"
import { NextResponse, type NextRequest } from "next/server"
import { openSession, SESSION_COOKIE } from "@/lib/auth/session"
import { FRAPPE_URL, siteHeaders } from "@/lib/frappe/config"

const DOCUMENTS: Record<string, { doctype: string; format: string }> = {
  invoice: { doctype: "Sales Invoice", format: "Quality Care Invoice" },
  receipt: { doctype: "Payment Entry", format: "Quality Care Receipt" },
  bill: { doctype: "Purchase Invoice", format: "Quality Care Supplier Bill" },
  tractor: { doctype: "Tractor Hire Log", format: "Quality Care Tractor Job" },
  class: { doctype: "Training Batch", format: "Quality Care Class List" },
}

/** Frappe checks this person's print rights on the document. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ kind: string; name: string }> }) {
  const { kind, name } = await params
  const document = DOCUMENTS[kind]
  if (!document) return new NextResponse("Not found.", { status: 404 })
  const session = await openSession((await cookies()).get(SESSION_COOKIE)?.value)
  if (!session) return NextResponse.redirect(new URL("/session/end", request.url))
  const url = new URL(`${FRAPPE_URL}/api/method/frappe.utils.print_format.download_pdf`)
  url.searchParams.set("doctype", document.doctype)
  url.searchParams.set("name", decodeURIComponent(name))
  url.searchParams.set("format", document.format)
  url.searchParams.set("no_letterhead", "1")
  const response = await fetch(url, { cache: "no-store", headers: { ...siteHeaders, Authorization: `Bearer ${session.accessToken}` } })
  if (!response.ok) return new NextResponse("This document could not be opened.", { status: response.status })
  return new NextResponse(response.body, {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${encodeURIComponent(decodeURIComponent(name))}.pdf"` },
  })
}
