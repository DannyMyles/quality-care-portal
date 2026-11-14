import { type NextRequest } from "next/server"
import { streamFile } from "@/lib/frappe/stream"

/** A file that came with an email. Frappe checks this person may read the email. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ file: string }> }) {
  const file = decodeURIComponent((await params).file)
  const name = request.nextUrl.searchParams.get("name") ?? "attachment"
  // Always saved, never shown in the browser, as a received file could be anything.
  return streamFile(request, "email_attachment", { file }, "application/octet-stream", `attachment; filename*=UTF-8''${encodeURIComponent(name)}`)
}
