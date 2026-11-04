import { notFound } from "next/navigation"
import { DownloadCsv } from "@/components/forms/download-csv"
import { FilterBar, PeriodFilter } from "@/components/shared/filters"
import { PageHeader } from "@/components/shared/page-header"
import { RecordTable } from "@/components/shared/record-table"
import { api } from "@/lib/frappe/client"
import { formatDate, formatKes, pageOf } from "@/lib/format"
import type { ReportResult } from "@/lib/frappe/types"
import { describeRange, readPeriod } from "@/lib/period"
import { REPORTS } from "@/lib/reports"

function display(value: string | number | null | undefined, type?: string) {
  if (value === null || value === undefined || value === "") return "—"
  if (type === "Currency") return formatKes(Number(value))
  if (type === "Date") return formatDate(String(value))
  if (type === "Int") return Number(value).toLocaleString("en-KE")
  return String(value).replace(/ - QC$/, "")
}

export default async function ReportPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { slug } = await params
  const report = REPORTS.find((entry) => entry.slug === slug)
  if (!report) notFound()
  const search = await searchParams
  const chosen = readPeriod(search)
  const { page, start, limit } = pageOf(search)
  const data = await api<ReportResult>("report", { params: { slug, from_date: chosen?.from, to_date: chosen?.to } })
  const csv = [data.columns.map((column) => column.label), ...data.rows.map((row) => data.columns.map((column) => String(row[column.fieldname] ?? "")))]
  return (
    <div>
      <PageHeader title={report.title} description={report.description} actions={<DownloadCsv filename={`${slug}-${data.from_date}-to-${data.to_date}.csv`} rows={csv} />} />
      {!report.noDates && (
        <FilterBar>
          <PeriodFilter years={data.years} defaultLabel="All dates" />
          <span className="text-sm text-muted-foreground">{describeRange(data.from_date, data.to_date)}</span>
        </FilterBar>
      )}
      <RecordTable
        columns={data.columns.map((column) => ({
          header: column.label,
          align: column.fieldtype === "Currency" || column.fieldtype === "Int" ? ("right" as const) : undefined,
          cell: (row: ReportResult["rows"][number]) => <span className={row.bold ? "font-semibold" : undefined}>{display(row[column.fieldname], column.fieldtype)}</span>,
        }))}
        rows={report.whole ? data.rows : data.rows.slice(start, start + limit)}
        {...(report.whole ? {} : { total: data.rows.length, page, path: `/reports/${slug}`, params: search })}
        rowKey={(row) => data.columns.map((column) => String(row[column.fieldname] ?? "")).join("|")}
        empty="Nothing in this period"
        emptyDescription="Try a wider date range."
      />
    </div>
  )
}
