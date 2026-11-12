import { ActionButton } from "@/components/forms/action-button"
import { otherCompany } from "@/components/shared/other-company"
import { FormDialog } from "@/components/forms/form-dialog"
import { DetailList } from "@/components/shared/detail-list"
import { PageHeader } from "@/components/shared/page-header"
import { PrintLink } from "@/components/shared/print-link"
import { RecordLink } from "@/components/shared/record-table"
import { StatusBadge } from "@/components/shared/status-badge"
import { createTractorInvoice, updateTractorLog } from "@/lib/actions"
import { api, getMe } from "@/lib/frappe/client"
import { formatDate, formatKes } from "@/lib/format"
import type { TractorLog } from "@/lib/frappe/types"
import { tractorFields } from "../fields"

export default async function TractorJobPage({ params }: { params: Promise<{ name: string }> }) {
  const name = decodeURIComponent((await params).name)
  const me = await getMe()
  const away = otherCompany(me, "tractor", "Tractor jobs")
  if (away) return away
  const job = await api<TractorLog & { notes?: string }>("tractor_log", { params: { name } })
  const saved = job as unknown as Record<string, string | number | undefined>
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={name}
        description={`${job.customer} · ${formatDate(job.hire_date)}`}
        actions={
          <>
            <StatusBadge status={job.status} />
            <PrintLink kind="tractor" name={name} />
            {!job.sales_invoice && job.status !== "Booked" && me.can.invoices && <ActionButton variant="outline" label="Create invoice" success="Draft invoice created" action={createTractorInvoice.bind(null, name)} />}
            {!job.sales_invoice && job.status !== "Booked" && me.can.edit_tractor && (
              <FormDialog
                key={JSON.stringify(job)}
                title="Edit tractor job"
                triggerLabel="Edit"
                trigger="edit"
                success="Job updated"
                fields={tractorFields.map((field) => ({ ...field, initial: saved[field.name] ?? "" }))}
                action={updateTractorLog.bind(null, name)}
              />
            )}
          </>
        }
      />
      <DetailList
        rows={[
          { label: "Customer", value: job.customer },
          { label: "Service", value: job.item },
          { label: "Work", value: `${job.quantity} ${job.charge_basis}` },
          { label: "Rate", value: formatKes(job.rate, true) },
          { label: "Amount", value: formatKes(job.amount, true) },
          { label: "Location", value: job.location },
          { label: "Operator", value: job.operator },
          { label: "Invoice", value: job.sales_invoice ? (me.can.invoices ? <RecordLink href={`/invoices/${encodeURIComponent(job.sales_invoice)}`}>{job.sales_invoice}</RecordLink> : job.sales_invoice) : null },
        ]}
      />
      {job.notes && (
        <div>
          <h2 className="mb-1 font-medium">Notes</h2>
          <p className="max-w-3xl text-sm whitespace-pre-line text-[#5E6182]">{job.notes}</p>
        </div>
      )}
    </div>
  )
}
