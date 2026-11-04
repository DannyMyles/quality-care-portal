import { CopyPayLink } from "@/components/forms/copy-pay-link"
import { paymentFields } from "@/components/forms/fields"
import { ActionButton } from "@/components/forms/action-button"
import { FormDialog } from "@/components/forms/form-dialog"
import { ChartCard } from "@/components/charts/chart-card"
import { PrintLink } from "@/components/shared/print-link"
import { DeskLink } from "@/components/shared/desk-link"
import { PageHeader } from "@/components/shared/page-header"
import { RecordTable } from "@/components/shared/record-table"
import { StatusBadge } from "@/components/shared/status-badge"
import { recordPayment, requestMpesa, retryEtims, submitInvoice } from "@/lib/actions"
import { api, getMe } from "@/lib/frappe/client"
import { formatDate, formatKes } from "@/lib/format"
import type { Invoice } from "@/lib/frappe/types"

interface Detail {
  invoice: Invoice
  items: { item_name: string; description: string; qty: number; rate: number; amount: number }[]
  payments: { name: string; posting_date: string; mode_of_payment?: string; reference_no?: string; allocated_amount: number }[]
  mpesa_requests: { name: string; phone: string; amount: number; status: string; result_description?: string }[]
  mpesa_enabled: boolean
  pay_url: string
  etims_enabled: boolean
}

export default async function InvoicePage({ params }: { params: Promise<{ name: string }> }) {
  const name = decodeURIComponent((await params).name)
  const me = await getMe()
  const data = await api<Detail>("invoice", { params: { name } })
  const { invoice } = data
  const isDraft = invoice.docstatus === 0
  const owing = invoice.docstatus === 1 && invoice.outstanding_amount > 0
  const unsigned = invoice.docstatus === 1 && data.etims_enabled && !invoice.custom_sales_invoice_signed
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={name}
        description={`${invoice.customer_name ?? invoice.customer} · ${formatDate(invoice.posting_date)}`}
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <StatusBadge status={invoice.status} />
            <DeskLink doctype="Sales Invoice" name={name} />
            <PrintLink kind="invoice" name={name} />
            {isDraft && me.can.submit_invoices && (
              <ActionButton label="Submit invoice" success="Invoice submitted" confirm="Once submitted, this invoice goes into the books and can only be reversed with a credit note." action={submitInvoice.bind(null, name)} />
            )}
            {owing && me.can.payments && (
              <FormDialog title="Record a payment" description={`${formatKes(invoice.outstanding_amount, true)} is still unpaid.`} triggerLabel="Record payment" submitLabel="Record payment" success="Payment recorded" showPlus={false} fields={paymentFields(invoice.outstanding_amount)} action={recordPayment.bind(null, name)} />
            )}
            {data.pay_url && <CopyPayLink url={data.pay_url} />}
            {owing && data.mpesa_enabled && me.can.mpesa && (
              <FormDialog title="Send an M-Pesa request" description="The customer gets a prompt on their phone for the unpaid balance." triggerLabel="Request M-Pesa" submitLabel="Send request" success="Request sent to their phone" showPlus={false} variant="outline" fields={[{ name: "phone", label: "Phone", type: "tel", required: true, full: true, placeholder: "0712 345 678" }]} action={requestMpesa.bind(null, name)} />
            )}
            {unsigned && me.can.submit_invoices && <ActionButton variant="outline" label="Retry eTIMS" success="Sent to eTIMS again" action={retryEtims.bind(null, name)} />}
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
            { header: "Receipt", cell: (row) => <PrintLink kind="receipt" name={row.name} label="Print" /> },
          ]}
          rows={data.payments}
          rowKey={(row) => row.name}
          empty="No payments yet"
        />
      </section>
    </div>
  )
}
