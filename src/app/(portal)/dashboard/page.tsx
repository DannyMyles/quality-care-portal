import Link from "next/link"
import { AlertTriangle, Award, Calendar, CheckCircle2, ChevronRight, InfoIcon, Tractor, UsersRound } from "@/components/icons"
import { DivergingBars, RankedBars } from "@/components/charts/bars"
import { ChartCard } from "@/components/charts/chart-card"
import { DonutCard, type DonutSlice } from "@/components/charts/donut"
import { CERTIFICATE_COLOURS, CLASS_COLOURS, LINE_ORDER, lineColour } from "@/components/charts/palette"
import { PeriodChart } from "@/components/charts/period-chart"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { QuoteCard } from "@/components/dashboard/quote-card"
import { PeriodFilter } from "@/components/shared/filters"
import { KpiCard } from "@/components/shared/kpi-card"
import { StatusBadge } from "@/components/shared/status-badge"
import { api, getMe } from "@/lib/frappe/client"
import { compactKes, formatDate, formatKes } from "@/lib/format"
import type { Me, Overview, QueueItem, WorkQueue } from "@/lib/frappe/types"
import { describeRange, readPeriod, todayIso } from "@/lib/period"
import { getRandomQuote } from "@/lib/quote"
import { cn } from "@/lib/utils"

export default async function DashboardPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const chosen = readPeriod(await searchParams)
  const [me, quote] = await Promise.all([getMe(), getRandomQuote()])
  const overview = me.can.finance ? await api<Overview>("overview", { params: chosen ? { from_date: chosen.from, to_date: chosen.to } : {} }) : null
  const today = todayIso()
  const range = overview ? { from: overview.from_date, to: overview.to_date } : chosen ?? { from: `${today.slice(0, 4)}-01-01`, to: today }
  const queue = await api<WorkQueue>("work_queue", { params: { from_date: range.from, to_date: range.to } })
  const label = describeRange(range.from, range.to)
  return (
    <div className="flex flex-col gap-6">
      <DashboardHeader
        firstName={me.full_name.split(" ")[0]}
        subtitle={overview ? "How Quality Care is doing, and what needs you next." : "Your work at a glance."}
        actions={<PeriodFilter years={queue.years} defaultLabel={overview ? `Latest figures (${overview.from_date.slice(0, 4)})` : "This year"} />}
        quote={<QuoteCard quote={quote} />}
      />
      {overview ? <FinanceView overview={overview} queue={queue} me={me} label={label} /> : <WorkView queue={queue} label={label} />}
    </div>
  )
}

/** "Up 12% on 2023", or nothing when there's no fair comparison. */
function change(current: number, previous: number | undefined, label: string) {
  if (!previous) return undefined
  const percent = Math.round(((current - previous) / Math.abs(previous)) * 100)
  if (percent === 0) return `Same as ${label}`
  return `${percent > 0 ? "Up" : "Down"} ${Math.abs(percent)}% on ${label}`
}

function FinanceView({ overview, queue, me, label }: { overview: Overview; queue: WorkQueue; me: Me; label: string }) {
  const { totals, previous } = overview
  const before = previous ? describeRange(previous.from_date, previous.to_date) : ""
  return (
    <>
      <section aria-label={`Summary for ${label}`} className="relative overflow-hidden rounded-3xl bg-[#14154F] p-6 text-white shadow-[0_10px_40px_rgba(46,48,148,0.28)] sm:p-8">
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_85%_0%,rgba(0,163,224,0.45),transparent_50%),radial-gradient(circle_at_0%_100%,rgba(61,72,200,0.7),transparent_55%)]" />
        <div className="relative grid gap-8 lg:grid-cols-[1.4fr_1fr_1fr_1fr] lg:items-end">
          <div>
            <p className="text-sm text-white/75">{totals.profit < 0 ? "Net loss" : "Net profit"}, {label}</p>
            <p className="mt-1 font-heading text-4xl font-bold tracking-tight tabular-nums sm:text-[44px]">{formatKes(Math.abs(totals.profit))}</p>
            {previous && <p className="mt-1 text-xs text-white/75">{change(totals.profit, previous.profit, before)}</p>}
          </div>
          <HeroStat label="Income" value={compactKes(totals.income)} full={formatKes(totals.income)} note={change(totals.income, previous?.income, before)} />
          <HeroStat label="Expenses" value={compactKes(totals.expenses)} full={formatKes(totals.expenses)} note={change(totals.expenses, previous?.expenses, before)} />
          <HeroStat label="Kept from each KES 100 earned" value={totals.margin === null ? "—" : `KES ${Math.round(totals.margin)}`} />
        </div>
      </section>

      {overview.notes.map((note) => (
        <p key={note} className="flex gap-2.5 rounded-2xl bg-[#FFF8DF] px-4 py-3 text-[13px] text-[#755A00]">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          {note}
        </p>
      ))}

      <InPeriodTiles queue={queue} label={label} />

      {overview.has_figures ? (
        <FinanceCharts overview={overview} queue={queue} me={me} label={label} />
      ) : (
        <div className="grid gap-6 xl:grid-cols-3">
          <ChartCard title={`No figures for ${label} yet`} subtitle="Nothing has been posted to the books for these dates" className="xl:col-span-2">
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-[#2E3094]/10 text-[#2E3094]">
                <Calendar className="size-6" />
              </span>
              <p className="max-w-md text-sm text-[#6A6C8C]">
                {overview.years_with_figures.length ? `The books currently hold figures for ${overview.years_with_figures.join(", ")}. ` : ""}
                Once entries are posted for this period, they&apos;ll show here on their own.
              </p>
            </div>
          </ChartCard>
          <WorkQueuePanel items={queue.items} />
        </div>
      )}

      <ActivityTiles activity={queue.activity} />
      <StatusDonuts activity={queue.activity} />
    </>
  )
}

function FinanceCharts({ overview, queue, me, label }: { overview: Overview; queue: WorkQueue; me: Me; label: string }) {
  const { totals, business_lines: lines } = overview
  return (
    <>
      <div className="grid gap-6 xl:grid-cols-3">
        <PeriodChart periods={overview.periods} title="Income and expenses by month" subtitle={`Monthly comparison for ${label}`} className="xl:col-span-2" />
        <WorkQueuePanel items={queue.items} />
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <DonutCard title="Where income comes from" subtitle="By business line" slices={lineSlices(lines, "income")} centre={compactKes(totals.income)} centreLabel="income" money />
        <DonutCard title="Where costs sit" subtitle="By business line" slices={lineSlices(lines, "expenses")} centre={compactKes(totals.expenses)} centreLabel="expenses" money />
        <ChartCard
          title="Which business lines make money"
          subtitle="Profit to the right, loss to the left"
          className="md:col-span-2 xl:col-span-1"
          table={{
            headers: ["Business line", "Income", "Expenses", "Profit / (loss)", "Margin"],
            rows: lines.map((line) => [line.name, formatKes(line.income), formatKes(line.expenses), formatKes(line.profit), line.margin === null ? "—" : `${line.margin}%`]),
          }}
        >
          <DivergingBars rows={lines.map((line) => ({ name: line.name, value: line.profit, note: line.margin === null || line.margin < 0 ? undefined : `${Math.round(line.margin)}% margin` }))} />
        </ChartCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard
          title="What brings the money in"
          subtitle={`Largest income, out of ${compactKes(totals.income)}`}
          table={{ headers: ["Income", "Amount", "Share"], rows: overview.income_breakdown.map((row) => [row.name, formatKes(row.amount), `${row.share}%`]) }}
        >
          <RankedBars rows={overview.income_breakdown.map((row) => ({ name: row.name, value: row.amount, note: `${Math.round(row.share)}%`, other: row.other }))} />
        </ChartCard>
        <ChartCard
          title="Where the money goes"
          subtitle={`Largest costs, out of ${compactKes(totals.expenses)}`}
          table={{ headers: ["Cost", "Amount", "Share"], rows: overview.expense_breakdown.map((row) => [row.name, formatKes(row.amount), `${row.share}%`]) }}
        >
          <RankedBars rows={overview.expense_breakdown.map((row) => ({ name: row.name, value: row.amount, note: `${Math.round(row.share)}%`, other: row.other }))} colour="#00A3E0" />
        </ChartCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <ChartCard title="What the numbers say" subtitle={`Worked out from the figures for ${label}`}>
          <ul className="flex flex-col gap-3">
            {overview.insights.map((insight) => (
              <li key={insight.title} className="flex gap-2.5 text-[13px]">
                {insight.tone === "warning" ? (
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                ) : insight.tone === "good" ? (
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#068A70]" />
                ) : (
                  <InfoIcon className="mt-0.5 size-4 shrink-0 text-[#2E3094]" />
                )}
                <span>
                  <strong className="font-semibold text-[#12133D]">{insight.title}.</strong> <span className="text-[#6A6C8C]">{insight.detail}</span>
                </span>
              </li>
            ))}
          </ul>
        </ChartCard>
        <ChartCard title="Owed to Quality Care" subtitle={`${overview.receivables.count} customer${overview.receivables.count === 1 ? "" : "s"}, ${formatKes(overview.receivables.total)} in all`}>
          {overview.receivables.customers.length ? (
            <RankedBars rows={overview.receivables.customers.map((row) => ({ name: row.customer, value: row.amount }))} />
          ) : (
            <p className="py-4 text-sm text-[#6A6C8C]">Nothing is owed right now.</p>
          )}
        </ChartCard>
        {overview.provisional.length > 0 && me.can.finance && (
          <ChartCard title="Still provisional" subtitle="Parked until statements arrive, so the balance sheet isn't final">
            <ul className="flex flex-col gap-2 text-[13px]">
              {overview.provisional.map((row) => (
                <li key={row.label} className="flex justify-between gap-3">
                  <span className="text-[#5E6182]">{row.label}</span>
                  <span className="font-medium whitespace-nowrap tabular-nums">{compactKes(row.amount)}</span>
                </li>
              ))}
            </ul>
          </ChartCard>
        )}
      </div>
    </>
  )
}

function InPeriodTiles({ queue, label }: { queue: WorkQueue; label: string }) {
  const period = queue.in_period
  if (!period || !Object.values(period).some(Boolean)) return null
  const tiles = [
    period.classes !== undefined && <KpiCard key="classes" label={`Classes started, ${label}`} value={period.classes} icon={Calendar} iconTint="emerald" helperText={`${period.trainees ?? 0} trainees`} />,
    period.certificates !== undefined && <KpiCard key="certificates" label={`Certificates issued, ${label}`} value={period.certificates} icon={Award} iconTint="amber" />,
    period.tractor_jobs !== undefined && <KpiCard key="tractor" label={`Tractor jobs, ${label}`} value={period.tractor_jobs} icon={Tractor} iconTint="cyan" helperText={formatKes(period.tractor_value ?? 0)} />,
  ].filter(Boolean)
  return <div className="grid gap-5 sm:grid-cols-3">{tiles}</div>
}

function lineSlices(lines: Overview["business_lines"], key: "income" | "expenses"): DonutSlice[] {
  return [...lines]
    .sort((a, b) => LINE_ORDER.indexOf(a.name) - LINE_ORDER.indexOf(b.name))
    .map((line) => ({ name: line.name, value: line[key], colour: lineColour(line.name) }))
}

function statusSlices(counts: Record<string, number> | undefined, colours: Record<string, string>): DonutSlice[] {
  return Object.keys(colours).map((name) => ({ name, value: counts?.[name] ?? 0, colour: colours[name] }))
}

/** Only drawn once there are at least two statuses, as an empty or single-colour ring says nothing. */
function StatusDonuts({ activity }: { activity: WorkQueue["activity"] }) {
  const certificates = statusSlices(activity.certificates, CERTIFICATE_COLOURS)
  const classes = statusSlices(activity.batches, CLASS_COLOURS)
  const total = (slices: DonutSlice[]) => slices.reduce((sum, slice) => sum + slice.value, 0)
  const worthDrawing = (slices: DonutSlice[]) => slices.filter((slice) => slice.value > 0).length > 1
  if (!worthDrawing(certificates) && !worthDrawing(classes)) return null
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {worthDrawing(classes) && <DonutCard title="Classes by status" slices={classes} centre={String(total(classes))} centreLabel="classes" />}
      {worthDrawing(certificates) && <DonutCard title="Certificates by status" slices={certificates} centre={String(total(certificates))} centreLabel="certificates" />}
    </div>
  )
}

function HeroStat({ label, value, full, note }: { label: string; value: string; full?: string; note?: string }) {
  return (
    <div title={full}>
      <p className="text-sm text-white/75">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      {note && <p className="mt-1 text-xs text-white/75">{note}</p>}
    </div>
  )
}

function WorkView({ queue, label }: { queue: WorkQueue; label: string }) {
  const upcoming = queue.activity.upcoming ?? []
  return (
    <>
      <InPeriodTiles queue={queue} label={label} />
      <ActivityTiles activity={queue.activity} />
      <StatusDonuts activity={queue.activity} />
      <div className="grid gap-6 lg:grid-cols-2">
        <WorkQueuePanel items={queue.items} />
        {queue.activity.batches && (
          <ChartCard title="Current and upcoming classes">
            {upcoming.length ? (
              <ul className="flex flex-col divide-y divide-[#F1F2FA]">
                {upcoming.map((batch) => (
                  <li key={batch.name}>
                    <Link prefetch={false} href={`/batches/${encodeURIComponent(batch.name)}`} className="flex items-center justify-between gap-3 py-2.5 hover:opacity-80">
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{batch.course_name}</span>
                        <span className="text-xs text-[#6A6C8C]">
                          {formatDate(batch.start_date)} · {batch.trainee_count ?? 0} trainees
                        </span>
                      </span>
                      <StatusBadge status={batch.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-4 text-sm text-[#6A6C8C]">No classes are planned yet.</p>
            )}
          </ChartCard>
        )}
      </div>
    </>
  )
}

function ActivityTiles({ activity }: { activity: WorkQueue["activity"] }) {
  const tiles = [
    activity.trainees !== undefined && <KpiCard key="trainees" label="Trainees on record" value={activity.trainees} icon={UsersRound} />,
    activity.batches && <KpiCard key="batches" label="Classes running or planned" value={(activity.batches["In Progress"] ?? 0) + (activity.batches["Planned"] ?? 0)} icon={Calendar} iconTint="emerald" />,
    activity.certificates && <KpiCard key="certificates" label="Certificates issued" value={activity.certificates["Issued"] ?? 0} icon={Award} iconTint="amber" />,
    activity.tractor && <KpiCard key="tractor" label="Tractor jobs to invoice" value={activity.tractor["To Invoice"] ?? 0} icon={Tractor} iconTint="cyan" />,
  ].filter(Boolean)
  if (!tiles.length) return null
  return <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">{tiles}</div>
}

const TONE: Record<QueueItem["tone"], string> = {
  info: "bg-[#2E3094]/10 text-[#2E3094]",
  warning: "bg-[#F5C400]/25 text-[#755A00]",
  critical: "bg-[#EB2239]/10 text-[#B5152A]",
}

function WorkQueuePanel({ items }: { items: QueueItem[] }) {
  return (
    <ChartCard title="Needs your attention" subtitle="Work waiting for someone in your role">
      {items.length ? (
        <ul className="flex flex-col gap-1.5">
          {items.map((item) => (
            <li key={item.key}>
              <Link prefetch={false} href={item.href} className="flex items-center gap-3 rounded-xl p-2.5 transition-colors hover:bg-[#F6F7FB]">
                <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold tabular-nums", TONE[item.tone])}>{item.count}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-[#12133D]">{item.label}</span>
                  {item.amount ? <span className="text-xs text-[#6A6C8C]">{formatKes(item.amount)}</span> : null}
                </span>
                <ChevronRight className="size-4 text-[#9A9DB8]" />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-[#0AC6A2]/15 text-[#068A70]">
            <CheckCircle2 className="size-6" />
          </span>
          <p className="text-sm font-medium">You&apos;re all caught up</p>
          <p className="text-xs text-[#6A6C8C]">Nothing is waiting for you right now.</p>
        </div>
      )}
    </ChartCard>
  )
}
