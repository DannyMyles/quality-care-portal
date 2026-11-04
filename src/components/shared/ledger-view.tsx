import Link from "next/link"
import { RankedBars } from "@/components/charts/bars"
import { ChartCard } from "@/components/charts/chart-card"
import { DateFilter, FilterBar, SelectFilter } from "@/components/shared/filters"
import { KpiCard } from "@/components/shared/kpi-card"
import { PageHeader } from "@/components/shared/page-header"
import { RecordTable } from "@/components/shared/record-table"
import { api } from "@/lib/frappe/client"
import { compactKes, formatDate, formatKes, pageOf } from "@/lib/format"
import type { Page } from "@/lib/frappe/types"

interface Row {
  name: string
  posting_date: string
  voucher_type: string
  voucher_no: string
  remarks?: string
  cost_center: string
  party?: string
  account_name: string
  amount: number
}

interface Ledger extends Page<Row> {
  accounts: { account: string; number?: string; name: string; amount: number }[]
  sum: number
}

const VOUCHER_PATH: Record<string, string> = { "Journal Entry": "/books/journals/", "Sales Invoice": "/invoices/" }

/** Income and Expenses share this: a total, each account's share, and every posting behind them. */
export async function LedgerView({
  rootType,
  title,
  description,
  path,
  colour,
  params,
}: {
  rootType: "Income" | "Expense"
  title: string
  description: string
  path: string
  colour: string
  params: Record<string, string | undefined>
}) {
  const { page, start, limit } = pageOf(params)
  const data = await api<Ledger>("ledger", { params: { root_type: rootType, account: params.account, from_date: params.from, to_date: params.to, start, limit } })
  const chosen = data.accounts.find((row) => row.account === params.account)
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={title} description={description} />
      <FilterBar>
        <DateFilter />
        <SelectFilter param="account" placeholder="All accounts" className="w-full sm:w-64" options={data.accounts.map((row) => ({ value: row.account, label: row.name }))} />
      </FilterBar>
      <div className="grid gap-5 lg:grid-cols-3">
        <KpiCard label={chosen ? chosen.name : `Total ${title.toLowerCase()}`} value={formatKes(data.sum, true)} helperText={params.from || params.to ? `${params.from ? formatDate(params.from) : "Start"} to ${params.to ? formatDate(params.to) : "today"}` : "All dates so far"} />
        <ChartCard title="By account" subtitle="Largest first" className="lg:col-span-2" table={{ headers: ["Account", "Amount"], rows: data.accounts.map((row) => [row.name, formatKes(row.amount, true)]) }}>
          {data.accounts.length ? (
            <RankedBars rows={data.accounts.slice(0, 8).map((row) => ({ name: row.name, value: row.amount }))} colour={colour} valueLabel={compactKes} />
          ) : (
            <p className="py-4 text-sm text-[#6A6C8C]">Nothing in this period.</p>
          )}
        </ChartCard>
      </div>
      <section>
        <h2 className="mb-1 text-base">Transactions</h2>
        <RecordTable
          columns={[
            { header: "Date", cell: (row) => formatDate(row.posting_date) },
            { header: "Account", cell: (row) => <span className="font-medium">{row.account_name}</span> },
            { header: "Business line", wide: true, cell: (row) => row.cost_center },
            {
              header: "From",
              cell: (row) =>
                VOUCHER_PATH[row.voucher_type] ? (
                  <Link prefetch={false} className="font-medium text-[#2E3094] hover:underline" href={`${VOUCHER_PATH[row.voucher_type]}${encodeURIComponent(row.voucher_no)}`}>
                    {row.voucher_no}
                  </Link>
                ) : (
                  row.voucher_no
                ),
            },
            { header: "Amount", align: "right", cell: (row) => formatKes(row.amount, true) },
          ]}
          rows={data.rows}
          rowKey={(row) => row.name}
          empty="No transactions in this period"
          total={data.total}
          page={page}
          path={path}
          params={params}
        />
      </section>
    </div>
  )
}
