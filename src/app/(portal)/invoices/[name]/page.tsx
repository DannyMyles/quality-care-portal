import { CopyPayLink } from "@/components/forms/copy-pay-link"
import { paymentFields } from "@/components/forms/fields"
import { ActionButton } from "@/components/forms/action-button"
import { FormDialog } from "@/components/forms/form-dialog"
import { ChartCard } from "@/components/charts/chart-card"
import { EmailButton } from "@/components/email/email-button"
import { EmailHistory } from "@/components/email/email-history"
import { ActionsMenu } from "@/components/shared/actions-menu"
import { PrintLink } from "@/components/shared/print-link"
import { PageHeader } from "@/components/shared/page-header"
import { RecordTable } from "@/components/shared/record-table"
import { StatusBadge } from "@/components/shared/status-badge"
import { cancelRecord, recordPayment, requestMpesa, retryEtims, submitInvoice } from "@/lib/actions"
import { DeleteButton } from "@/components/forms/delete-button"
import { InvoiceForm, type InvoiceDraft, type InvoiceItemOption } from "@/components/invoices/invoice-form"
import { api, getMe } from "@/lib/frappe/client"
import { formatDate, formatKes } from "@/lib/format"
import type { EmailRow, Invoice } from "@/lib/frappe/types"

interface Detail {
  invoice: Invoice
  items: { item_name: string; description: string; qty: number; rate: number; amount: number }[]
  payments: { name: string; posting_date: string; mode_of_payment?: string; reference_no?: string; allocated_amount: number }[]
  mpesa_requests: { name: string; phone: string; amount: number; status: string; result_description?: string }[]
  emails: EmailRow[]
  mpesa_enabled: boolean
  pay_url: string
  etims_enabled: boolean
  lines: InvoiceDraft["lines"]
  draft: { due_date?: string; remarks?: string }
  made_from: string | null
}

export default async function InvoicePage({ params }: { params: Promise<{ name: string }> }) {
  const name = decodeURIComponent((await params).name)
  const me = await getMe()
  const data = await api<Detail>("invoice", { params: { name } })
  const { invoice } = data
  const isDraft = invoice.docstatus === 0
  const owing = invoice.docstatus === 1 && invoice.outstanding_amount > 0
  const unsigned = invoice.docstatus === 1 && data.etims_enabled && !invoice.custom_sales_invoice_signed
  const editable = isDraft && me.can.edit_invoices && !data.made_from
  const options = editable ? await api<{ items: InvoiceItemOption[] }>("invoice_options") : null
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={name}
        description={`${invoice.customer_name ?? invoice.customer} · ${formatDate(invoice.posting_date)}`}
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <StatusBadge status={invoice.status} />
            {owing && data.mpesa_enabled && me.can.mpesa && (
              <FormDialog title="Send an M-Pesa prompt" description={`The customer gets a prompt on their phone to pay the ${formatKes(invoice.outstanding_amount, true)} balance, and enters their M-Pesa PIN to pay.`} triggerLabel="Request M-Pesa" submitLabel="Send prompt" success="Prompt sent to their phone" showPlus={false} fields={[{ name: "phone", label: "Customer's phone", type: "tel", required: true, full: true, placeholder: "0712 345 678" }]} action={requestMpesa.bind(null, name)} />
            )}
            {options && <InvoiceForm items={options.items} invoice={{ name, customer: invoice.customer, posting_date: invoice.posting_date, due_date: data.draft.due_date, remarks: data.draft.remarks, lines: data.lines }} />}
            <ActionsMenu>
              <PrintLink kind="invoice" name={name} />
              {invoice.docstatus === 1 && me.mail.send.invoice && <EmailButton kind="invoice" name={name} label="Email invoice" />}
              {isDraft && me.can.submit_invoices && (
                <ActionButton label="Submit invoice" success="Invoice submitted" confirm="Once submitted, this invoice goes into the books and can only be reversed with a credit note." action={submitInvoice.bind(null, name)} />
              )}
              {owing && me.can.payments && (
                <FormDialog title="Record a payment" description={`${formatKes(invoice.outstanding_amount, true)} is still unpaid.`} triggerLabel="Record payment" submitLabel="Record payment" success="Payment recorded" showPlus={false} fields={paymentFields(invoice.outstanding_amount)} action={recordPayment.bind(null, name)} />
              )}
              {data.pay_url && <CopyPayLink url={data.pay_url} />}
              {isDraft && data.mpesa_enabled && me.can.mpesa && <p className="max-w-56 px-1 py-1 text-xs text-[#6A6C8C]">Submit the invoice first. Then you can send the customer an M-Pesa prompt.</p>}
              {unsigned && me.can.submit_invoices && <ActionButton variant="outline" label="Retry eTIMS" success="Sent to eTIMS again" action={retryEtims.bind(null, name)} />}
              {isDraft && me.delete.invoice && <DeleteButton kind="invoice" name={name} what={`draft ${name}`} goTo="/invoices" />}
              {invoice.docstatus === 1 && me.cancel.invoice && (
                <ActionButton variant="outline" label="Cancel invoice" success="Invoice cancelled" confirm={`Cancel ${name}? It's taken out of the books. Any payment against it must be cancelled first.`} action={cancelRecord.bind(null, "invoice", name)} />
              )}
            </ActionsMenu>
          </div>
        }
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RecordTable
            columns={[
              { header: "Description", cell: (row) => row.description?.replace(/<[^>]+>/g, "") || row.item_name },
              { header: "Qty", align: "right", cell: (row) => row.qty },
              { header: "Rate", align: "right", cell: (row) => formatKes(row.rate) },
              { header: "Amount", align: "right", cell: (row) => formatKes(row.amount) },
            ]}
            rows={data.items}
            rowKey={(row) => `${row.description}${row.amount}`}
            empty="No lines"
          />
        </div>
        <ChartCard title="Summary">
          <dl className="flex flex-col gap-2.5 text-sm">
            <div className="flex justify-between"><dt className="text-[#6A6C8C]">Total</dt><dd className="font-semibold tabular-nums">{formatKes(invoice.grand_total, true)}</dd></div>
            <div className="flex justify-between"><dt className="text-[#6A6C8C]">Unpaid</dt><dd className="font-semibold tabular-nums">{formatKes(invoice.outstanding_amount, true)}</dd></div>
            <div className="flex justify-between"><dt className="text-[#6A6C8C]">Due</dt><dd>{formatDate(invoice.due_date)}</dd></div>
            {data.etims_enabled && (
              <div className="flex items-center justify-between"><dt className="text-[#6A6C8C]">eTIMS</dt><dd>{invoice.custom_cu_invoice_number ?? <StatusBadge status="Not signed" />}</dd></div>
            )}
          </dl>
        </ChartCard>
      </div>
      <section>
        <h2 className="mb-1 text-base">Payments</h2>
        <RecordTable
          columns={[
            { header: "Payment", cell: (row) => row.name },
            { header: "Date", cell: (row) => formatDate(row.posting_date) },
            { header: "Paid by", cell: (row) => (row.mode_of_payment === "Wire Transfer" ? "Bank transfer" : row.mode_of_payment) },
            { header: "Reference", cell: (row) => row.reference_no ?? "—" },
            { header: "Amount", align: "right", cell: (row) => formatKes(row.allocated_amount, true) },
            {
              header: "Receipt",
              cell: (row) => (
                <div className="flex gap-1.5">
                  <PrintLink kind="receipt" name={row.name} label="Print" />
                  {me.mail.send.receipt && <EmailButton kind="receipt" name={row.name} size="sm" />}
                </div>
              ),
            },
          ]}
          rows={data.payments}
          rowKey={(row) => row.name}
          empty="No payments yet"
        />
      </section>
      {(data.emails.length > 0 || (invoice.docstatus === 1 && me.mail.send.invoice)) && <EmailHistory rows={data.emails} />}
    </div>
  )
}
