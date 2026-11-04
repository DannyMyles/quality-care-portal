import { ExternalLink } from "@/components/icons"

/** Open this record in the full system. A plain link, so nothing prefetches the one-time key. */
export function DeskLink({ doctype, name, label = "Open in Desk" }: { doctype: string; name: string; label?: string }) {
  const path = `/desk/${doctype.toLowerCase().replace(/ /g, "-")}/${encodeURIComponent(name)}`
  return (
    <a
      href={`/desk?to=${encodeURIComponent(path)}`}
      target="_blank"
      rel="noopener"
      className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#E3E5F1] bg-white px-3 text-[13px] font-medium text-[#2E3094] transition-colors hover:bg-[#F3F4FB]"
    >
      <ExternalLink className="size-4" />
      {label}
    </a>
  )
}
