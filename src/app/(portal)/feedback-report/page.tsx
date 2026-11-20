import Link from "next/link"
import { redirect } from "next/navigation"
import { Messages } from "@/components/icons"
import { otherCompany } from "@/components/shared/other-company"
import { FilterBar, PeriodFilter, SelectFilter } from "@/components/shared/filters"
import { KpiCard } from "@/components/shared/kpi-card"
import { PageHeader } from "@/components/shared/page-header"
import { RecordLink, RecordTable } from "@/components/shared/record-table"
import { api, getMe } from "@/lib/frappe/client"
import { formatDate } from "@/lib/format"
import { readPeriod } from "@/lib/period"

interface Summary {
  responses: number
  overall: number | null
  instructor: number | null
  content: number | null
  venue: number | null
  recommend: number | null
}
interface Group extends Summary {
  name: string
}
interface ClassRow extends Summary {
  name: string
  course: string
  start_date: string
  place?: string
  trainer?: string
  students: number
}
interface Comment {
  class: string
  course: string
  trainee_name: string
  submitted_on: string
  overall: number
  liked?: string
  improve?: string
}
interface Report {
  overall: Summary
  courses: Group[]
  trainers: Group[]
  classes: ClassRow[]
  low: ClassRow[]
  comments: Comment[]
  low_mark: number
  course_options: { value: string; label: string }[]
  trainer_options: string[]
}

const score = (value: number | null) => (value === null ? "—" : `${value} / 5`)
const marked = (value: number | null, low: number) => <span className={value !== null && value < low ? "font-semibold text-[#B5152A]" : undefined}>{score(value)}</span>

export default async function FeedbackReportPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams
  const me = await getMe()
  if (!me.can.feedback) redirect("/no-access")
  const away = otherCompany(me, "training", "Feedback")
  if (away) return away
  const period = readPeriod(params)
  const report = await api<Report>("feedback_report", { params: { from_date: period?.from, to_date: period?.to, course: params.course, trainer: params.trainer } })
  const years = Array.from(new Set(report.classes.map((row) => row.start_date.slice(0, 4))))
  const groupColumns = (label: string) => [
    { header: label, cell: (row: Group) => row.name },
    { header: "Responses", align: "right" as const, cell: (row: Group) => row.responses },
    { header: "Overall", align: "right" as const, cell: (row: Group) => marked(row.overall, report.low_mark) },
    { header: "Instructor", align: "right" as const, cell: (row: Group) => score(row.instructor), wide: true },
    { header: "Content", align: "right" as const, cell: (row: Group) => score(row.content), wide: true },
    { header: "Venue", align: "right" as const, cell: (row: Group) => score(row.venue), wide: true },
    { header: "Recommend", align: "right" as const, cell: (row: Group) => (row.recommend === null ? "—" : `${row.recommend}%`) },
  ]
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Feedback" description="What students say, by course and by trainer, and which classes need a look." />
      <FilterBar>
        <PeriodFilter years={years} defaultLabel="All classes" />
        <SelectFilter param="course" placeholder="All courses" options={report.course_options ?? []} />
        <SelectFilter param="trainer" placeholder="All trainers" options={(report.trainer_options ?? []).map((value) => ({ value, label: value }))} />
      </FilterBar>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Responses" value={report.overall.responses} icon={Messages} />
        <KpiCard label="Overall rating" value={score(report.overall.overall)} icon={Messages} iconTint="amber" />
        <KpiCard label="Would recommend us" value={report.overall.recommend === null ? "—" : `${report.overall.recommend}%`} icon={Messages} iconTint="emerald" />
        <KpiCard label="Classes rated low" value={report.low.length} icon={Messages} iconTint={report.low.length ? "red" : "cyan"} helperText={`Below ${report.low_mark} out of 5 overall`} />
      </div>
      {report.low.length > 0 && (
        <section>
          <h2 className="mb-1 text-base text-[#B5152A]">Classes rated low</h2>
          <RecordTable
            columns={[
              { header: "Class", cell: (row: ClassRow) => <RecordLink href={`/batches/${encodeURIComponent(row.name)}`} sub={`${formatDate(row.start_date)}${row.place ? ` · ${row.place}` : ""}`}>{row.course}</RecordLink> },
              { header: "Trainer", cell: (row: ClassRow) => row.trainer ?? "—", wide: true },
              { header: "Responses", align: "right", cell: (row: ClassRow) => `${row.responses} of ${row.students}` },
              { header: "Overall", align: "right", cell: (row: ClassRow) => marked(row.overall, report.low_mark) },
            ]}
            rows={report.low}
            rowKey={(row) => row.name}
            empty=""
          />
        </section>
      )}
      <section>
        <h2 className="mb-1 text-base">By course</h2>
        <RecordTable columns={groupColumns("Course")} rows={report.courses} rowKey={(row) => row.name} empty="No feedback yet" emptyIcon={Messages} />
      </section>
      <section>
        <h2 className="mb-1 text-base">By trainer</h2>
        <RecordTable columns={groupColumns("Trainer")} rows={report.trainers} rowKey={(row) => row.name} empty="No feedback yet" emptyIcon={Messages} />
      </section>
      {report.comments.length > 0 && (
        <section>
          <h2 className="mb-1 text-base">Latest comments</h2>
          <ul className="flex flex-col gap-3">
            {report.comments.map((row) => (
              <li key={`${row.class}${row.trainee_name}`} className="rounded-2xl border border-[#E3E5F1] bg-white p-4 text-sm">
                <p className="mb-1 text-xs text-[#6A6C8C]">
                  <Link prefetch={false} href={`/batches/${encodeURIComponent(row.class)}`} className="font-medium text-[#2E3094] hover:underline">{row.course}</Link> · {row.trainee_name} · {formatDate(row.submitted_on)} · {row.overall} / 5
                </p>
                {row.liked && <p><span className="text-[#6A6C8C]">Went well: </span>{row.liked}</p>}
                {row.improve && <p><span className="text-[#6A6C8C]">Could be better: </span>{row.improve}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
