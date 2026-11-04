import { Printer } from "@/components/icons"

const SHAPE = "inline-flex h-9 items-center gap-2 rounded-lg border border-[#E3E5F1] bg-white px-3 text-[13px] font-medium whitespace-nowrap text-[#2E3094] transition-colors hover:bg-[#F3F4FB]"

export function PrintLink({ kind, name, label = "Print" }: { kind: "invoice" | "receipt" | "bill" | "tractor" | "class"; name: string; label?: string }) {
  return (
    <a href={`/print/${kind}/${encodeURIComponent(name)}`} target="_blank" rel="noopener" className={SHAPE}>
      <Printer className="size-4" />
      {label}
    </a>
  )
}
