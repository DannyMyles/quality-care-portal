import { ActionButton } from "@/components/forms/action-button"
import { FormDialog } from "@/components/forms/form-dialog"
import { HireForm } from "@/components/hire/hire-form"
import { ReturnForm } from "@/components/hire/return-form"
import { DetailList } from "@/components/shared/detail-list"
import { otherCompany } from "@/components/shared/other-company"
import { PageHeader } from "@/components/shared/page-header"
import { RecordLink, RecordTable } from "@/components/shared/record-table"
import { StatusBadge } from "@/components/shared/status-badge"
import { approveHireRate, createHireInvoice, updateHireNotes } from "@/lib/actions"
import { api, getMe } from "@/lib/frappe/client"
import { formatDate, formatKes } from "@/lib/format"
import type { Hire, HireItem } from "@/lib/frappe/types"

export default async function HirePage({ params }: { params: Promise<{ name: string }> }) {
  const name = decodeURIComponent((await params).name)
  const me = await getMe()
  const away = otherCompany(me, "training", "Equipment hires")
  if (away) return away
  const hire = await api<Hire>("hire_record", { params: { name } })
  const unit = hire.hire_basis === "Weeks" ? "week" : "day"
  const length = `${hire.periods} ${unit}${hire.periods === 1 ? "" : "s"}`
  const waiting = !!hire.negotiated && !hire.rate_approved_by && !hire.sales_invoice
  const edit = me.can.edit_hires
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={hire.customer}
        description={`${name} · ${formatDate(hire.hire_date)} for ${length}`}
        actions={
          <>
            <StatusBadge status={hire.overdue ? "Overdue" : hire.status} />
            {waiting && <StatusBadge status="Needs approval" />}
            {hire.can_approve && <ActionButton label="Approve rate" success="Negotiated rate approved" confirm={`Approve ${formatKes(hire.total_amount)} for this hire, instead of the set rates?`} action={approveHireRate.bind(null, name)} />}
            {edit && !hire.sales_invoice && me.can.make_invoices && !waiting && <ActionButton variant="outline" label="Create invoice" success="Draft invoice created" action={createHireInvoice.bind(null, name)} />}
            {edit && <ReturnForm hire={hire} />}
            {edit && !hire.sales_invoice && <HireForm hire={hire} />}
          </>
        }
      />
      {waiting && (
        <p role="status" className="rounded-xl bg-[#F5C400]/20 px-4 py-3 text-sm text-[#755A00]">
          This hire has a negotiated rate. A Director must approve it before it can be invoiced.
          {hire.negotiation_reason ? ` Reason given: ${hire.negotiation_reason}` : ""}
        </p>
      )}
      {hire.overdue && (
        <p role="status" className="rounded-xl bg-[#EB2239]/10 px-4 py-3 text-sm text-[#87000A]">
          This equipment was due back on {formatDate(hire.due_back)} and hasn&apos;t been recorded as returned.
        </p>
      )}
      <DetailList
        rows={[
          { label: "Customer", value: hire.customer },
          { label: "Hired on", value: formatDate(hire.hire_date) },
          { label: "Period", value: length },
          { label: "Due back", value: formatDate(hire.due_back) },
          { label: "Returned on", value: hire.return_date ? `${formatDate(hire.return_date)}${hire.days_late ? `, ${hire.days_late} day${hire.days_late === 1 ? "" : "s"} late` : ""}` : null },
          { label: "Total", value: formatKes(hire.total_amount, true) },
          { label: "Rate", value: hire.negotiated ? (hire.rate_approved_by ? `Negotiated, approved by ${hire.rate_approved_by}` : "Negotiated, not yet approved") : "Set rates" },
          { label: "Invoice", value: hire.sales_invoice ? (me.can.invoices ? <RecordLink href={`/invoices/${encodeURIComponent(hire.sales_invoice)}`}>{hire.sales_invoice}</RecordLink> : hire.sales_invoice) : null },
        ]}
      />
      <section>
        <h2 className="mb-1 text-base">Equipment</h2>
        <RecordTable
          columns={[
            { header: "Item", cell: (row: HireItem) => (me.can.equipment ? <RecordLink href={`/equipment/${encodeURIComponent(row.asset)}`} sub={row.asset}>{row.asset_name}</RecordLink> : <span className="flex flex-col">{row.asset_name}<span className="text-xs text-[#6A6C8C]">{row.asset}</span></span>) },
            { header: "Went out", cell: (row: HireItem) => row.condition_out },
            { header: "Came back", cell: (row: HireItem) => (row.condition_in ? <span className={["Damaged", "Missing"].includes(row.condition_in) ? "font-medium text-[#B5152A]" : undefined}>{row.condition_in}</span> : "—") },
            { header: `Rate per ${unit}`, align: "right", cell: (row: HireItem) => (<span>{formatKes(row.rate)}{row.rate !== row.standard_rate ? <span className="block text-xs text-[#6A6C8C]">Set rate {formatKes(row.standard_rate)}</span> : null}</span>) },
            { header: "Amount", align: "right", cell: (row: HireItem) => formatKes(row.amount) },
          ]}
          rows={hire.items}
          rowKey={(row) => row.name}
          empty=""
        />
      </section>
      {(hire.negotiation_reason || hire.return_notes || hire.notes || edit) && (
        <div className="grid gap-5 md:grid-cols-3">
          {hire.negotiation_reason && (
            <div>
              <h2 className="mb-1 font-medium">Why the rate was changed</h2>
              <p className="text-sm whitespace-pre-line text-[#5E6182]">{hire.negotiation_reason}</p>
            </div>
          )}
          {hire.return_notes && (
            <div>
              <h2 className="mb-1 font-medium">On return</h2>
              <p className="text-sm whitespace-pre-line text-[#5E6182]">{hire.return_notes}</p>
            </div>
          )}
          <div>
            <h2 className="mb-1 flex items-center gap-2 font-medium">
              Notes
              {edit && hire.sales_invoice && <FormDialog title="Notes" triggerLabel="Edit notes" trigger="edit" success="Notes saved" fields={[{ name: "notes", label: "Notes", type: "textarea", initial: hire.notes ?? "" }]} action={updateHireNotes.bind(null, name)} />}
            </h2>
            <p className="text-sm whitespace-pre-line text-[#5E6182]">{hire.notes || "—"}</p>
          </div>
        </div>
      )}
    </div>
  )
}
