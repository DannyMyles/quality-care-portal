import { NextResponse, type NextRequest } from "next/server"
import { streamFile } from "@/lib/frappe/stream"

const PARTIES: Record<string, string> = { supplier: "Supplier", customer: "Customer" }

/** A statement of account as a PDF. Frappe checks this person's rights to the record. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ type: string; name: string }> }) {
  const { type, name } = await params
  const party_type = PARTIES[type]
  if (!party_type) return new NextResponse("Not found.", { status: 404 })
  const { searchParams } = request.nextUrl
  const dates = Object.fromEntries(["from_date", "to_date"].flatMap((key) => (searchParams.get(key) ? [[key, searchParams.get(key) as string]] : [])))
  return streamFile(request, "statement_pdf", { party_type, name: decodeURIComponent(name), ...dates }, "application/pdf", `inline; filename="statement-${encodeURIComponent(decodeURIComponent(name))}.pdf"`)
}
