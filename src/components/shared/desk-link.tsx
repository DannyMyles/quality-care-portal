import { ExternalLink } from "@/components/icons"

/** Open a page of the full system. A plain link, so nothing prefetches the one-time key. */
export function DeskLink({ path, label = "Open in full system" }: { path: string; label?: string }) {
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
