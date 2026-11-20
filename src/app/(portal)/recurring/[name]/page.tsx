import { ActionButton } from "@/components/forms/action-button"
import { FormDialog } from "@/components/forms/form-dialog"
import { DetailList } from "@/components/shared/detail-list"
import { PageHeader } from "@/components/shared/page-header"
import { RecordLink, RecordTable } from "@/components/shared/record-table"
import { StatusBadge } from "@/components/shared/status-badge"
import { createRecurringInvoices, saveRecurringCharge, type FormValues } from "@/lib/actions"
import { api, getMe } from "@/lib/frappe/client"
import { formatDate, formatKes } from "@/lib/format"
import type { RecurringCharge } from "@/lib/frappe/types"
import { chargeFields, type RecurringOptions } from "../fields"

interface InvoiceRow {
  name: string
  posting_date: string
  grand_total: number
  outstanding_amount: number
  status: string
  docstatus: number
}

const EVERY = { Month: "Every month", Quarter: "Every quarter", Year: "Every year" }

export default async function RecurringChargePage({ params }: { params: Promise<{ name: string }> }) {
  const name = decodeURIComponent((await params).name)
  const me = await getMe()
  const [{ charge, invoices }, options] = await Promise.all([api<{ charge: RecurringCharge; invoices: InvoiceRow[] }>("recurring_charge", { params: { name } }), api<RecurringOptions>("recurring_options")])
  const today = new Date().toISOString().slice(0, 10)
  const due = !!charge.active && !!charge.next_date && charge.next_date <= today && (!charge.end_date || charge.next_date <= charge.end_date)
  const update = async (values: FormValues) => {
    "use server"
    return saveRecurringCharge({ ...values, name })
  }
  const setActive = async (active: number) => {
    "use server"
    return saveRecurringCharge({ name, active })
  }
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={charge.customer}
        description={`${charge.description} · ${name}`}
        actions={
          <>
            <StatusBadge status={charge.active ? "Active" : "Stopped"} />
            {me.can.make_invoices && due && <ActionButton label="Create due invoices" success="Due invoices drafted" action={createRecurringInvoices.bind(null, name)} />}
            {me.can.edit_recurring && (
              <ActionButton
                variant="outline"
                label={charge.active ? "Stop" : "Start again"}
                success={charge.active ? "Charge stopped" : "Charge started again"}
                confirm={charge.active ? "Stop billing this charge? No more invoices are made until it's started again." : undefined}
                action={setActive.bind(null, charge.active ? 0 : 1)}
              />
            )}
            {me.can.edit_recurring && <FormDialog key={JSON.stringify(charge)} title="Change recurring charge" triggerLabel="Edit" trigger="edit" success="Recurring charge saved" fields={chargeFields(options, charge)} action={update} />}
          </>
        }
      />
      <DetailList
        rows={[
          { label: "Amount", value: formatKes(charge.amount, true) },
          { label: "Charged", value: `${EVERY[charge.frequency]}, on day ${charge.day_of_month}` },
          { label: "Charged as", value: charge.item },
          { label: "Property or vehicle", value: charge.cost_center?.replace(/ - [A-Z]+$/, "") },
          { label: "Next invoice", value: charge.active ? formatDate(charge.next_date) : "Stopped" },
          { label: "Last invoice by", value: charge.end_date ? formatDate(charge.end_date) : "No end date" },
        ]}
      />
      {charge.notes && (
        <div>
          <h2 className="mb-1 font-medium">Notes</h2>
          <p className="max-w-3xl text-sm whitespace-pre-line text-[#5E6182]">{charge.notes}</p>
        </div>
      )}
      <section>
        <h2 className="mb-1 text-base">Invoices</h2>
        <RecordTable
          columns={[
            { header: "Invoice", cell: (row: InvoiceRow) => (me.can.invoices ? <RecordLink href={`/invoices/${encodeURIComponent(row.name)}`}>{row.name}</RecordLink> : row.name) },
            { header: "Dated", cell: (row: InvoiceRow) => formatDate(row.posting_date) },
            { header: "Status", cell: (row: InvoiceRow) => <StatusBadge status={row.status} /> },
            { header: "Total", align: "right", cell: (row: InvoiceRow) => formatKes(row.grand_total) },
            { header: "Unpaid", align: "right", cell: (row: InvoiceRow) => formatKes(row.outstanding_amount) },
          ]}
          rows={invoices}
          rowKey={(row) => row.name}
          empty="No invoices yet. The first is made on its due day."
        />
      </section>
    </div>
  )
}
