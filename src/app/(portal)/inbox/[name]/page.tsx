import Link from "next/link"
import { ActionButton } from "@/components/forms/action-button"
import { FormDialog, type FormField } from "@/components/forms/form-dialog"
import { MessageFrame } from "@/components/email/message-frame"
import { ArrowLeft, Download, Paperclip, Reply } from "@/components/icons"
import { PageHeader } from "@/components/shared/page-header"
import { StatusBadge } from "@/components/shared/status-badge"
import { billFromEmail, closeEmail, fileEmail, replyEmail, unfileEmail } from "@/lib/actions"
import { isQualityCare } from "@/lib/company"
import { deliveryLabel, displayName, recordLabel, recordPath } from "@/lib/email"
import { api, getMe } from "@/lib/frappe/client"
import { cn } from "@/lib/utils"

interface Message {
  name: string
  subject?: string
  sender?: string
  sender_full_name?: string
  recipients?: string
  cc?: string
  date: string
  sent_or_received: "Sent" | "Received"
  status: string
  delivery_status?: string
  reference_doctype?: string
  reference_name?: string
  party?: { doctype: string; name: string; title?: string } | null
  html: string
  attachments: { name: string; file_name: string; file_size?: number }[]
  thread: { name: string; subject?: string; sender?: string; sender_full_name?: string; sent_or_received: string; communication_date: string }[]
  can_reply: boolean
  can_file: boolean
  can_bill: boolean
}

interface BillOptions {
  expense_accounts: { name: string; account_name: string }[]
  cost_centres: string[]
  suppliers: { name: string; supplier_name: string; tax_withholding_category?: string }[]
}

/** The new-bill form, started from what the email says: who sent it and what about. */
function billFields(options: BillOptions, data: Message): FormField[] {
  const withholding = options.suppliers.filter((supplier) => supplier.tax_withholding_category).map((supplier) => supplier.name)
  const supplier = data.party?.doctype === "Supplier" ? data.party.name : ""
  return [
    { name: "supplier", label: "Supplier", type: "select", required: true, full: true, initial: supplier, options: options.suppliers.map((row) => ({ value: row.name, label: row.supplier_name })), hint: supplier ? "Matched from the sender's email address." : "The sender's address isn't on a supplier, so choose one." },
    { name: "description", label: "What is this for?", required: true, full: true, initial: data.subject ?? "" },
    { name: "amount", label: "Amount (KES)", type: "number", required: true, hint: "From the attached invoice." },
    { name: "date", label: "Bill date", type: "date", required: true, initial: new Date().toISOString().slice(0, 10) },
    { name: "cost_center", label: "Business line", type: "select", required: true, options: options.cost_centres.map((value) => ({ value, label: value.replace(/ - [A-Z]+$/, "") })) },
    { name: "expense_account", label: "Type of cost", type: "select", required: true, hideWhen: { field: "supplier", values: withholding }, options: options.expense_accounts.map((account) => ({ value: account.name, label: account.account_name })) },
    { name: "bill_no", label: "Supplier's bill number" },
  ]
}

function when(value: string) {
  return new Date(value.replace(" ", "T")).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

function size(bytes?: number) {
  if (!bytes) return ""
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

/** Pick-lists for filing, each shown only when its kind of record is chosen. */
function fileFields(training: boolean, party?: Message["party"]): FormField[] {
  const kinds = [
    { value: "Customer", label: "Customer", field: "customer" },
    { value: "Supplier", label: "Supplier", field: "supplier" },
    { value: "Sales Invoice", label: "Invoice", field: "any_invoice" },
    { value: "Purchase Invoice", label: "Supplier bill", field: "bill" },
    ...(training ? [{ value: "Trainee", label: "Trainee", field: "trainee" }] : []),
  ]
  return [
    { name: "doctype", label: "File under", type: "select", required: true, full: true, initial: party?.doctype ?? "", options: kinds.map(({ value, label }) => ({ value, label })) },
    ...kinds.map(({ value, label, field }) => ({
      name: field,
      label,
      type: "lookup" as const,
      lookup: field,
      required: true,
      full: true,
      initial: party?.doctype === value ? party.name : "",
      hideWhen: { field: "doctype", values: ["", ...kinds.filter((other) => other.value !== value).map((other) => other.value)] },
    })),
  ]
}

export default async function EmailPage({ params }: { params: Promise<{ name: string }> }) {
  const name = decodeURIComponent((await params).name)
  const me = await getMe()
  const data = await api<Message>("email_message", { params: { name } })
  const billOptions = data.can_bill ? await api<BillOptions>("bill_options").catch(() => null) : null
  const received = data.sent_or_received === "Received"
  const filedAt = recordPath(data.reference_doctype, data.reference_name)
  const closed = data.status === "Closed"
  return (
    <div className="flex flex-col gap-5">
      {me.can.inbox && (
        <Link href="/inbox" className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-[#2E3094] hover:underline">
          <ArrowLeft className="size-4" /> Inbox
        </Link>
      )}
      <PageHeader
        title={data.subject || "(no subject)"}
        description={received ? `From ${displayName(data.sender, data.sender_full_name)}` : `Sent to ${data.recipients ?? ""}`}
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <StatusBadge status={received ? (data.status === "Linked" ? "Open" : data.status) : deliveryLabel(data)} />
            {data.can_reply && (
              <FormDialog
                title="Reply"
                description={`To ${received ? data.sender : data.recipients}. Their message is quoted below yours.`}
                triggerLabel="Reply"
                submitLabel="Send reply"
                success="Reply sent"
                showPlus={false}
                fields={[
                  { name: "message", label: "Message", type: "textarea", required: true, full: true },
                  { name: "cc", label: "Copy to", type: "text", full: true, placeholder: "Optional. Separate addresses with commas" },
                ]}
                action={replyEmail.bind(null, name)}
              />
            )}
            {data.can_file && (
              <FormDialog
                title="File this email"
                description="Filed emails show on that record, so anyone looking at it sees the conversation."
                triggerLabel={data.reference_name ? "File elsewhere" : "File under…"}
                submitLabel="File it"
                success="Email filed"
                showPlus={false}
                variant="outline"
                fields={fileFields(isQualityCare(me.company), data.party)}
                action={fileEmail.bind(null, name)}
              />
            )}
            {billOptions && (
              <FormDialog
                title="Make a draft bill"
                description={`The email${data.attachments.length ? ` and its ${data.attachments.length} attachment${data.attachments.length === 1 ? "" : "s"}` : ""} go on the bill, so it's easy to check before submitting.`}
                triggerLabel="Make a draft bill"
                submitLabel="Save draft bill"
                success="Draft bill saved"
                showPlus={false}
                variant="outline"
                fields={billFields(billOptions, data)}
                action={billFromEmail.bind(null, name)}
                goTo="/bills/{result}"
              />
            )}
            {data.can_file && data.reference_name && <ActionButton variant="outline" label="Unfile" success="No longer filed" action={unfileEmail.bind(null, name)} />}
            {data.can_file && <ActionButton variant="outline" label={closed ? "Reopen" : "Close"} success={closed ? "Reopened" : "Closed"} action={closeEmail.bind(null, name, !closed)} />}
          </div>
        }
      />

      <dl className="grid min-w-0 gap-x-6 gap-y-2 rounded-2xl bg-white p-4 text-sm shadow-[0_1px_2px_rgba(18,19,61,0.04)] sm:grid-cols-[auto_1fr]">
        <dt className="text-[#6A6C8C]">From</dt>
        <dd className="min-w-0 [overflow-wrap:anywhere]">
          {data.sender}
          {data.party && <span className="block text-[#6A6C8C]">{data.party.doctype}: {data.party.title ?? data.party.name}</span>}
        </dd>
        <dt className="text-[#6A6C8C]">To</dt>
        <dd className="min-w-0 [overflow-wrap:anywhere]">{data.recipients}</dd>
        {data.cc && (
          <>
            <dt className="text-[#6A6C8C]">Copy</dt>
            <dd className="min-w-0 [overflow-wrap:anywhere]">{data.cc}</dd>
          </>
        )}
        <dt className="text-[#6A6C8C]">Date</dt>
        <dd>{when(data.date)}</dd>
        <dt className="text-[#6A6C8C]">Filed under</dt>
        <dd>
          {data.reference_name ? (
            filedAt ? (
              <Link href={filedAt} className="font-medium text-[#2E3094] hover:underline">
                {recordLabel(data.reference_doctype)} {data.reference_name}
              </Link>
            ) : (
              `${recordLabel(data.reference_doctype)} ${data.reference_name}`
            )
          ) : (
            "Not filed"
          )}
        </dd>
      </dl>

      <MessageFrame html={data.html} />

      {data.attachments.length > 0 && (
        <section>
          <h2 className="mb-2 text-base">Attachments</h2>
          <ul className="flex flex-wrap gap-2">
            {data.attachments.map((file) => (
              <li key={file.name}>
                <a
                  href={`/inbox/attachment/${encodeURIComponent(file.name)}?name=${encodeURIComponent(file.file_name)}`}
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#E3E5F1] bg-white px-3 text-[13px] font-medium text-[#2E3094] hover:bg-[#F3F4FB]"
                >
                  <Paperclip className="size-4" />
                  {file.file_name}
                  <span className="text-xs font-normal text-[#6A6C8C]">{size(file.file_size)}</span>
                  <Download className="size-4" />
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {data.thread.length > 0 && (
        <section>
          <h2 className="mb-2 text-base">Rest of the conversation</h2>
          <ol className="flex flex-col gap-1.5">
            {data.thread.map((item) => (
              <li key={item.name}>
                <Link href={`/inbox/${encodeURIComponent(item.name)}`} className="flex items-center gap-3 rounded-xl bg-white px-4 py-2.5 text-sm hover:bg-[#F3F4FB]">
                  <Reply className={cn("size-4 shrink-0", item.sent_or_received === "Sent" ? "text-[#2E3094]" : "-scale-x-100 text-[#00A3E0]")} />
                  <span className="min-w-0 flex-1 truncate">
                    <span className="font-medium">{item.sent_or_received === "Sent" ? "We wrote" : displayName(item.sender, item.sender_full_name)}</span>
                    <span className="text-[#6A6C8C]"> · {item.subject || "(no subject)"}</span>
                  </span>
                  <span className="shrink-0 text-xs text-[#6A6C8C]">{when(item.communication_date)}</span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  )
}
