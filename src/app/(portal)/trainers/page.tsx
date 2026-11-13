import { RankedBars } from "@/components/charts/bars"
import { otherCompany } from "@/components/shared/other-company"
import { ChartCard } from "@/components/charts/chart-card"
import { Teacher, Wallet, ReceiptText } from "@/components/icons"
import { FilterBar, PeriodFilter } from "@/components/shared/filters"
import { KpiCard } from "@/components/shared/kpi-card"
import { PageHeader } from "@/components/shared/page-header"
import { PrintLink } from "@/components/shared/print-link"
import { RecordTable } from "@/components/shared/record-table"
import { StatusTabs } from "@/components/shared/status-tabs"
import { api, getMe } from "@/lib/frappe/client"
import { compactKes, formatDate, formatKes, pageOf } from "@/lib/format"
import type { Page } from "@/lib/frappe/types"
import { describeRange, readPeriod } from "@/lib/period"

interface Row {
  name: string
  period: string
  trainer: string
  class_name: string
  amount_due: number
  wht_amount: number
  net_amount: number
  amount_paid: number
}

interface Data extends Page<Row> {
  summary: { trainer: string; pin?: string; due: number; wht: number; net: number; paid: number }[]
  months: { period: string; due: number; wht: number }[]
  recorded: { first: string; last: string } | null
  years: string[]
}

export default async function TrainersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams
  const me = await getMe()
  const away = otherCompany(me, "training", "Trainer payments")
  if (away) return away
  const { page, start, limit } = pageOf(params)
  const chosen = readPeriod(params)
  const data = await api<Data>("trainers", { params: { trainer: params.trainer, start, limit, from_date: chosen?.from, to_date: chosen?.to } })
  const held = data.recorded ? `Records run from ${describeRange(data.recorded.first, data.recorded.last)}. ` : ""
  const sum = (key: "due" | "wht" | "paid") => data.summary.reduce((total, row) => total + row[key], 0)
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Trainers & WHT" description={`Trainer fees and 5% withholding tax. ${held}These records don't post to the ledger.`} actions={<>{params.trainer && <PrintLink statement="supplier" name={params.trainer} from={chosen?.from} to={chosen?.to} label={`Print ${params.trainer}'s statement`} />}<PrintLink report="trainer-wht" from={chosen?.from} to={chosen?.to} label="Print WHT report" /></>} />
      <FilterBar>
        <PeriodFilter years={data.years} defaultLabel="All records" />
      </FilterBar>
      <div className="grid gap-5 sm:grid-cols-3">
        <KpiCard label="Fees, before tax" value={formatKes(sum("due"))} icon={Teacher} />
        <KpiCard label="Withholding tax at 5%" value={formatKes(sum("wht"))} icon={ReceiptText} iconTint="amber" />
        <KpiCard label="Recorded as paid" value={formatKes(sum("paid"))} icon={Wallet} iconTint="emerald" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Fees by trainer" subtitle="Before withholding tax" table={{ headers: ["Trainer", "Fees", "WHT", "Paid"], rows: data.summary.map((row) => [row.trainer, formatKes(row.due), formatKes(row.wht), formatKes(row.paid)]) }}>
          <RankedBars rows={data.summary.map((row) => ({ name: row.trainer, value: row.due }))} valueLabel={compactKes} />
        </ChartCard>
        <ChartCard title="Withholding tax by trainer" subtitle="With KRA PIN, for the monthly return">
          <RecordTable
            columns={[
              { header: "Trainer", cell: (row) => row.trainer },
              { header: "KRA PIN", cell: (row) => row.pin ?? "—" },
              { header: "WHT", align: "right", cell: (row) => formatKes(row.wht) },
            ]}
            rows={data.summary}
            rowKey={(row) => row.trainer}
            empty="No records"
          />
        </ChartCard>
      </div>
      <section>
        <h2 className="mb-3 text-base">Fees by class</h2>
        <StatusTabs path="/trainers" param="trainer" current={params.trainer} options={[{ value: "", label: "All" }, ...data.summary.map((row) => ({ value: row.trainer, label: row.trainer }))]} />
        <RecordTable
          columns={[
            { header: "Month", cell: (row) => formatDate(row.period) },
            { header: "Trainer", cell: (row) => row.trainer },
            { header: "Class", cell: (row) => row.class_name },
            { header: "Due", align: "right", cell: (row) => formatKes(row.amount_due) },
            { header: "WHT", align: "right", cell: (row) => formatKes(row.wht_amount) },
            { header: "Net", align: "right", cell: (row) => formatKes(row.net_amount) },
            { header: "Paid", align: "right", cell: (row) => formatKes(row.amount_paid) },
          ]}
          rows={data.rows}
          rowKey={(row) => row.name}
          empty="No records"
          total={data.total}
          page={page}
          path="/trainers"
          params={params}
        />
      </section>
    </div>
  )
}
