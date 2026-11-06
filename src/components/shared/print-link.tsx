import { Printer } from "@/components/icons"
import { getMe } from "@/lib/frappe/client"

const SHAPE = "inline-flex h-9 items-center gap-2 rounded-lg border border-[#E3E5F1] bg-white px-3 text-[13px] font-medium whitespace-nowrap text-[#2E3094] transition-colors hover:bg-[#F3F4FB]"

type Props = { label?: string; from?: string; to?: string } & (
  | { kind: "invoice" | "receipt" | "bill" | "tractor" | "class" | "journal" | "certificate"; name: string; report?: never; statement?: never }
  | { report: string; kind?: never; name?: never; statement?: never }
  | { statement: "supplier" | "customer"; name: string; kind?: never; report?: never }
)

function withDates(path: string, from?: string, to?: string) {
  const query = new URLSearchParams()
  if (from) query.set("from_date", from)
  if (to) query.set("to_date", to)
  const text = query.toString()
  return text ? `${path}?${text}` : path
}

/** Opens a PDF in a new tab. It only shows when this person has the Print permission for it in Desk. */
export async function PrintLink({ kind, name, report, statement, from, to, label = "Print" }: Props) {
  const { print } = await getMe()
  const allowed = report ? print.reports.includes(report) : print[(statement ?? kind) as Exclude<keyof typeof print, "reports">]
  if (!allowed) return null
  const target = encodeURIComponent(name ?? "")
  const href = report
    ? withDates(`/print/report/${report}`, from, to)
    : statement
      ? withDates(`/print/statement/${statement}/${target}`, from, to)
      : kind === "certificate"
        ? `/certificates/${target}/pdf`
        : `/print/${kind}/${target}`
  return (
    <a href={href} target="_blank" rel="noopener" className={SHAPE}>
      <Printer className="size-4" />
      {label}
    </a>
  )
}
