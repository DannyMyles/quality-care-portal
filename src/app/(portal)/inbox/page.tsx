import { Inbox, Paperclip } from "@/components/icons"
import { FilterBar, SearchFilter } from "@/components/shared/filters"
import { PageHeader } from "@/components/shared/page-header"
import { RecordLink, RecordTable, type Column } from "@/components/shared/record-table"
import { StatusBadge } from "@/components/shared/status-badge"
import { StatusTabs } from "@/components/shared/status-tabs"
import { displayName, recordLabel } from "@/lib/email"
import { shortCompany } from "@/lib/company"
import { api, getMe } from "@/lib/frappe/client"
import { formatDate, pageOf } from "@/lib/format"
import type { EmailRow, Page } from "@/lib/frappe/types"
import { cn } from "@/lib/utils"

const columns: Column<EmailRow>[] = [
  {
    header: "From",
    cell: (row) => (
      <span className={cn("flex items-center gap-2", !row.seen && "font-semibold text-[#12133D]")}>
        {!row.seen && <span aria-label="Unread" className="size-2 shrink-0 rounded-full bg-[#00A3E0]" />}
        <span>
          {row.party?.title ?? displayName(row.sender, row.sender_full_name)}
          {row.party && <span className="block text-xs font-normal text-[#6A6C8C]">{row.party.doctype}</span>}
        </span>
      </span>
    ),
  },
  {
    header: "Subject",
    cell: (row) => (
      <RecordLink href={`/inbox/${encodeURIComponent(row.name)}`} sub={formatDate(row.communication_date)}>
        <span className={cn("inline-flex items-center gap-1.5", !row.seen && "font-semibold")}>
          {row.subject || "(no subject)"}
          {!!row.has_attachment && <Paperclip className="size-3.5 text-[#6A6C8C]" aria-label="Has an attachment" />}
        </span>
      </RecordLink>
    ),
  },
  { header: "Filed under", wide: true, cell: (row) => (row.reference_name ? `${recordLabel(row.reference_doctype)} ${row.reference_name}` : "—") },
  { header: "Status", cell: (row) => <StatusBadge status={row.status === "Linked" ? "Open" : (row.status ?? "Open")} /> },
]

const TABS = [
  { value: "", label: "To do" },
  { value: "replied", label: "Replied" },
  { value: "closed", label: "Closed" },
  { value: "all", label: "All" },
]

export default async function InboxPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams
  const { page, start, limit } = pageOf(params)
  const me = await getMe()
  const data = await api<Page<EmailRow> & { mailboxes: string[]; unread: number }>("inbox", { params: { tab: params.tab || "todo", search: params.search, start, limit } })
  const company = shortCompany(me.company)
  if (!data.mailboxes.length) {
    return (
      <div>
        <PageHeader title="Inbox" description={`Emails to ${company}.`} />
        <RecordTable
          columns={columns}
          rows={[]}
          rowKey={(row) => row.name}
          empty={`${company} has no mailbox yet`}
          emptyDescription="Whoever runs the full system adds one under Email Account, with this company chosen and Enable Incoming ticked. Replies to the invoices and statements you send then arrive here."
          emptyIcon={Inbox}
        />
      </div>
    )
  }
  return (
    <div>
      <PageHeader
        title="Inbox"
        description={`Emails to ${company}${data.unread ? `, ${data.unread} unread` : ""}. Replies to invoices, receipts and statements are filed under them for you. New mail is collected every few minutes.`}
      />
      <StatusTabs path="/inbox" param="tab" current={params.tab} keep={params} options={TABS} />
      <FilterBar>
        <SearchFilter placeholder="Search by subject or sender" />
      </FilterBar>
      <RecordTable columns={columns} rows={data.rows} rowKey={(row) => row.name} empty="Nothing here" emptyDescription={params.tab ? undefined : "You're up to date."} emptyIcon={Inbox} total={data.total} page={page} path="/inbox" params={params} />
    </div>
  )
}
