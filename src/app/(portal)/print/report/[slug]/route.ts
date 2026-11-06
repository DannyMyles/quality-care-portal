import type { NextRequest } from "next/server"
import { streamFile } from "@/lib/frappe/stream"

/** A report as a PDF. Frappe checks this person's rights to the report. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { searchParams } = request.nextUrl
  const dates = Object.fromEntries(["from_date", "to_date"].flatMap((key) => (searchParams.get(key) ? [[key, searchParams.get(key) as string]] : [])))
  return streamFile(request, "report_pdf", { slug, ...dates }, "application/pdf", `inline; filename="${encodeURIComponent(slug)}.pdf"`)
}
