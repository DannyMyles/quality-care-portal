import { CheckCircle2, InfoIcon } from "@/components/icons"
import { ChartCard } from "@/components/charts/chart-card"
import { AsAtFilter, FilterBar } from "@/components/shared/filters"
import { KpiCard } from "@/components/shared/kpi-card"
import { PageHeader } from "@/components/shared/page-header"
import { PrintLink } from "@/components/shared/print-link"
import { api } from "@/lib/frappe/client"
import { formatDate, formatKes } from "@/lib/format"

interface Balances {
  to_date: string
  rows: { account_number?: string; account_name: string; root_type: string; debit: number; credit: number; balance: number }[]
  totals: Record<string, number>
  debit: number
  credit: number
}

const ORDER = ["Asset", "Liability", "Equity", "Income", "Expense"]
const LABEL: Record<string, string> = { Asset: "What we own", Liability: "What we owe", Equity: "Owner's equity", Income: "Income", Expense: "Expenses" }
/** Shown the way each section normally reads. Brackets mean the balance runs against that section. */
const DEBIT_SECTIONS = ["Asset", "Expense"]
function amount(type: string, balance: number) {
  const natural = DEBIT_SECTIONS.includes(type) ? balance : -balance
  return natural < 0 ? `(${formatKes(-natural)})` : formatKes(natural)
}

export default async function BooksPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams
  const balances = await api<Balances>("balances", { params: { to_date: params.to } })
  const groups = ORDER.filter((type) => balances.rows.some((row) => row.root_type === type))
  const agree = Math.abs(balances.debit - balances.credit) < 0.01
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Balances" description="Every account with a balance. This page is read-only; make changes in Desk." actions={<PrintLink report="trial-balance" to={params.to} label="Print trial balance" />} />
      <p className="flex items-start gap-2.5 rounded-xl bg-[#00A3E0]/10 px-4 py-3 text-sm">
        <InfoIcon className="mt-0.5 size-4 shrink-0 text-[#0078A8]" />
        Bank and loan balances are provisional until statements arrive, and the equipment register isn&apos;t on the balance sheet yet. Brackets mean a balance runs against its section, such as loan repayments waiting to be split.
      </p>
      <div className="grid gap-5 sm:grid-cols-3">
        <KpiCard label="Total debits" value={formatKes(balances.debit, true)} />
        <KpiCard label="Total credits" value={formatKes(balances.credit, true)} />
        <KpiCard label="Do the books balance?" value={agree ? "Yes" : "No"} icon={CheckCircle2} iconTint={agree ? "emerald" : "red"} helperText={`As at ${formatDate(balances.to_date)}`} />
      </div>
      <FilterBar>
        <AsAtFilter />
      </FilterBar>
      <div className="grid gap-6 xl:grid-cols-2">
        {groups.map((type) => (
          <ChartCard key={type} title={LABEL[type]} subtitle={`${amount(type, balances.totals[type])} in all`}>
            <table className="w-full text-sm">
              <tbody>
                {balances.rows.filter((row) => row.root_type === type).map((row) => (
                  <tr key={`${row.account_number}${row.account_name}`}>
                    <td className="border-b border-[#F4F5FB] py-2 pr-3">
                      <span className="mr-2 text-xs text-[#6A6C8C] tabular-nums">{row.account_number}</span>
                      {row.account_name}
                    </td>
                    <td className="border-b border-[#F4F5FB] py-2 text-right whitespace-nowrap tabular-nums">{amount(type, row.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ChartCard>
        ))}
      </div>
    </div>
  )
}
