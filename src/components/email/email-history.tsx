import { Mail, Paperclip } from "@/components/icons"
import { RecordLink, RecordTable } from "@/components/shared/record-table"
import { StatusBadge } from "@/components/shared/status-badge"
import { deliveryLabel, displayName, recordLabel } from "@/lib/email"
import { formatDate } from "@/lib/format"
import type { EmailRow } from "@/lib/frappe/types"

/** The emails sent about a record and the replies that came back, newest first. */
export function EmailHistory({ rows, title = "Emails" }: { rows: EmailRow[]; title?: string }) {
  return (
    <section>
      <h2 className="mb-1 text-base">{title}</h2>
      <RecordTable
        columns={[
          {
            header: "Subject",
            cell: (row) => (
              <RecordLink href={`/inbox/${encodeURIComponent(row.name)}`} sub={formatDate(row.communication_date)}>
                <span className="inline-flex items-center gap-1.5">
                  {row.subject || "(no subject)"}
                  {!!row.has_attachment && <Paperclip className="size-3.5 text-[#6A6C8C]" aria-label="Has an attachment" />}
                </span>
              </RecordLink>
            ),
          },
          {
            header: "Between",
            cell: (row) =>
              row.sent_or_received === "Received" ? `From ${displayName(row.sender, row.sender_full_name)}` : `To ${row.recipients ?? ""}`,
          },
          { header: "About", wide: true, cell: (row) => `${recordLabel(row.reference_doctype)} ${row.reference_name ?? ""}` },
          { header: "Status", cell: (row) => <StatusBadge status={deliveryLabel(row)} /> },
        ]}
        rows={rows}
        rowKey={(row) => row.name}
        empty="No emails yet"
        emptyIcon={Mail}
      />
    </section>
  )
}
