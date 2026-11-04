import Link from "next/link"
import { BarChart3, ChevronRight } from "@/components/icons"
import { PageHeader } from "@/components/shared/page-header"
import { api } from "@/lib/frappe/client"
import { REPORT_GROUPS, REPORTS } from "@/lib/reports"

export default async function ReportsPage() {
  const allowed = new Set(await api<string[]>("reports"))
  const reports = REPORTS.filter((report) => allowed.has(report.slug))
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Reports" description="Pick a report, choose the dates and download it if you need to." />
      {REPORT_GROUPS.filter((group) => reports.some((report) => report.group === group)).map((group) => (
        <section key={group}>
          <h2 className="mb-3 text-base">{group}</h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {reports.filter((report) => report.group === group).map((report) => (
              <Link prefetch={false} key={report.slug} href={`/reports/${report.slug}`} className="group flex items-center gap-4 rounded-2xl border border-[#EEF0F8] bg-white p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#2E3094]/10">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#2E3094]/10 text-[#2E3094]">
                  <BarChart3 className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-[#12133D]">{report.title}</span>
                  <span className="mt-0.5 block text-xs text-[#6A6C8C]">{report.description}</span>
                </span>
                <ChevronRight className="size-4 text-[#9A9DB8]" />
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
