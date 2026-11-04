import type { NextRequest } from "next/server"
import { streamFile } from "@/lib/frappe/stream"

export async function GET(request: NextRequest, { params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params
  return streamFile(
    request,
    "import_template",
    { kind },
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    `attachment; filename="quality-care-${encodeURIComponent(kind)}-template.xlsx"`
  )
}
