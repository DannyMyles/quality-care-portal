import { NextResponse, type NextRequest } from "next/server"
import { streamFile } from "@/lib/frappe/stream"

const KINDS = new Set(["invoice", "receipt", "bill", "tractor", "class", "journal"])

/** A single document as a PDF. Frappe checks this person's Print permission on it. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ kind: string; name: string }> }) {
  const { kind, name: encoded } = await params
  if (!KINDS.has(kind)) return new NextResponse("Not found.", { status: 404 })
  const name = decodeURIComponent(encoded)
  return streamFile(request, "document_pdf", { kind, name }, "application/pdf", `inline; filename="${encodeURIComponent(name)}.pdf"`)
}
