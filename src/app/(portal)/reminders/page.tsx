import { redirect } from "next/navigation"
import { Bell } from "@/components/icons"
import { ReminderForm } from "@/components/reminders/reminder-form"
import { PageHeader } from "@/components/shared/page-header"
import { RecordTable } from "@/components/shared/record-table"
import { StatusTabs } from "@/components/shared/status-tabs"
import { FilterBar, PeriodFilter, SearchFilter } from "@/components/shared/filters"
import { readPeriod } from "@/lib/period"
import { api, getMe } from "@/lib/frappe/client"
import { formatDate, pageOf } from "@/lib/format"
import type { Page, ReminderSettings } from "@/lib/frappe/types"

interface Due {
  kind: string
  doctype: string
  name: string
  to: string
  subject: string
}

interface Sent {
  name: string
  kind: string
  reference_doctype: string
  reference_name: string
  recipient: string
  sent_on: string
}

const LINKS: Record<string, string> = { "Sales Invoice": "/invoices/", "Equipment Hire Record": "/hires/", "Training Batch": "/batches/" }
const record = (doctype: string, name: string) => (LINKS[doctype] ? <a className="text-[#2E3094] hover:underline" href={`${LINKS[doctype]}${encodeURIComponent(name)}`}>{name}</a> : name)

export default async function RemindersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams
  const me = await getMe()
  if (!me.can.reminders) redirect("/no-access")
  const { page, start, limit } = pageOf(params)
  const [data, log] = await Promise.all([
    api<{ settings: ReminderSettings; can_edit: boolean; due: Due[] }>("reminder_settings"),
    api<Page<Sent> & { years: string[] }>("reminder_log", { params: { start, limit, kind: params.kind, search: params.search, from_date: readPeriod(params)?.from, to_date: readPeriod(params)?.to } }),
  ])
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Reminders" description="Emails that go out by themselves, from each company's own mailbox: reminders each morning at 8, receipts as payments come in. Each kind stays off until it's ticked." />
      <ReminderForm settings={data.settings} canEdit={data.can_edit} />
      <section>
        <h2 className="mb-1 text-base">Going out next</h2>
        <p className="mb-2 text-sm text-[#6A6C8C]">What the next morning run would send, with what&apos;s ticked now.</p>
        <RecordTable
          columns={[
            { header: "Reminder", cell: (row: Due) => row.kind },
            { header: "About", cell: (row: Due) => record(row.doctype, row.name) },
            { header: "To", cell: (row: Due) => row.to || <span className="text-[#B5152A]">No email on record</span> },
            { header: "Subject", cell: (row: Due) => row.subject, wide: true },
          ]}
          rows={data.due}
          rowKey={(row) => `${row.kind}${row.name}`}
          empty="Nothing to send"
          emptyIcon={Bell}
        />
      </section>
      <section>
        <h2 className="mb-1 text-base">Sent</h2>
        <StatusTabs
          path="/reminders"
          param="kind"
          current={params.kind}
          keep={params}
          options={[{ value: "", label: "All" }, ...["Overdue invoice", "Equipment due back", "Equipment late", "Certificate expiring", "Feedback request", "Payment receipt"].map((value) => ({ value, label: value }))]}
        />
        <FilterBar>
          <SearchFilter placeholder="Search by email or record" />
          <PeriodFilter years={log.years ?? []} defaultLabel="Any date" />
        </FilterBar>
        <RecordTable
          columns={[
            { header: "Sent", cell: (row: Sent) => formatDate(row.sent_on) },
            { header: "Reminder", cell: (row: Sent) => row.kind },
            { header: "About", cell: (row: Sent) => record(row.reference_doctype, row.reference_name) },
            { header: "To", cell: (row: Sent) => row.recipient, wide: true },
          ]}
          rows={log.rows}
          rowKey={(row) => row.name}
          empty="No reminders sent yet"
          total={log.total}
          page={page}
          path="/reminders"
          params={params}
        />
      </section>
    </div>
  )
}
