import type { NextRequest } from "next/server"
import { streamFile } from "@/lib/frappe/stream"

export async function GET(request: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params
  return streamFile(request, "certificate_pdf", { name }, "application/pdf", `inline; filename="${encodeURIComponent(name)}.pdf"`)
}
