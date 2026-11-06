import { ActionButton } from "@/components/forms/action-button"
import { CompletedToggle } from "@/components/forms/completed-toggle"
import { FormDialog } from "@/components/forms/form-dialog"
import { KpiCard } from "@/components/shared/kpi-card"
import { PageHeader } from "@/components/shared/page-header"
import { PrintLink } from "@/components/shared/print-link"
import { RecordLink, RecordTable } from "@/components/shared/record-table"
import { StatusBadge } from "@/components/shared/status-badge"
import { addBatchTrainee, createBatchInvoices, removeBatchTrainee, requestBatchCertificates, saveBatch, setTraineeCompleted, type FormValues } from "@/lib/actions"
import { api, getMe } from "@/lib/frappe/client"
import { formatDate, formatKes } from "@/lib/format"
import type { Batch, BatchRow } from "@/lib/frappe/types"
import { Award, CheckCircle2, ReceiptText, UsersRound } from "@/components/icons"

interface Detail {
  batch: Batch & { trainees?: BatchRow[] }
  invoices: { name: string; customer: string; grand_total: number; outstanding_amount: number; status: string }[]
  progress: { completed: number; invoiced: number; certified: number; to_invoice: number; to_certify: number }
}

const STATUSES = ["Planned", "In Progress", "Completed", "Cancelled"]

export default async function BatchPage({ params }: { params: Promise<{ name: string }> }) {
  const name = decodeURIComponent((await params).name)
  const me = await getMe()
  const { batch, invoices, progress } = await api<Detail>("batch", { params: { name } })
  const rows = batch.trainees ?? []
  const edit = me.can.edit_batches
  const setStatus = async (values: FormValues) => {
    "use server"
    return saveBatch({ ...values, name })
  }
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={batch.course_name ?? batch.course}
        description={`${formatDate(batch.start_date)}${batch.end_date ? ` to ${formatDate(batch.end_date)}` : ""}${batch.venue ? ` · ${batch.venue}` : ""}${batch.trainer ? ` · ${batch.trainer}` : ""}${batch.cpd_points ? ` · ${batch.cpd_points} CPD points` : ""}`}
        actions={
          <>
            <StatusBadge status={batch.status} />
            <PrintLink kind="class" name={name} label="Class list" />
            {edit && (
              <FormDialog
                title="Change status"
                triggerLabel="Status"
                showPlus={false}
                variant="outline"
                success="Status updated"
                fields={[{ name: "status", label: "Status", type: "select", required: true, initial: batch.status, options: STATUSES.map((value) => ({ value, label: value })) }]}
                action={setStatus}
              />
            )}
          </>
        }
      />
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Trainees" value={rows.length} icon={UsersRound} helperText={`${formatKes(batch.total_fees)} in fees`} />
        <KpiCard label="Finished" value={`${progress.completed} of ${rows.length}`} icon={CheckCircle2} iconTint="emerald" />
        <KpiCard label="Invoiced" value={`${progress.invoiced} of ${rows.length}`} icon={ReceiptText} iconTint="amber" />
        <KpiCard label="Certificates requested" value={`${progress.certified} of ${rows.length}`} icon={Award} iconTint="cyan" />
      </div>
      <section>
        <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base">Trainees</h2>
          {edit && (
            <div className="flex flex-wrap gap-2">
              {progress.to_invoice > 0 && <ActionButton variant="outline" label={`Create invoices (${progress.to_invoice})`} success="Draft invoices created" action={createBatchInvoices.bind(null, name)} />}
              {progress.to_certify > 0 && <ActionButton variant="outline" label={`Request certificates (${progress.to_certify})`} success="Sent to the Director for approval" action={requestBatchCertificates.bind(null, name)} />}
              <FormDialog
                title="Add a trainee"
                triggerLabel="Add trainee" trigger="add"
                success="Trainee added"
                fields={[
                  { name: "trainee", label: "Trainee", type: "lookup", lookup: "trainee", required: true, full: true },
                  { name: "fee", label: "Fee (KES)", type: "number", initial: batch.standard_fee, hint: "Change only if this trainee pays a different amount." },
                  { name: "customer", label: "Billed to", type: "lookup", lookup: "customer", hint: "Leave blank to use the trainee's usual payer." },
                ]}
                action={addBatchTrainee.bind(null, name)}
              />
            </div>
          )}
        </div>
        <RecordTable
          columns={[
            { header: "Trainee", cell: (row) => <RecordLink href={`/trainees/${encodeURIComponent(row.trainee)}`}>{row.trainee_name ?? row.trainee}</RecordLink> },
            { header: "Billed to", cell: (row) => row.customer ?? <span className="text-[#B5152A]">Not set</span> },
            { header: "Fee", align: "right", cell: (row) => formatKes(row.fee) },
            {
              header: "Finished",
              cell: (row) =>
                edit ? <CompletedToggle checked={!!row.completed} label={`${row.trainee_name} finished`} action={setTraineeCompleted.bind(null, name, row.name)} /> : row.completed ? "Yes" : "No",
            },
            { header: "Invoice", cell: (row) => (row.sales_invoice ? <RecordLink href={`/invoices/${encodeURIComponent(row.sales_invoice)}`}>{row.sales_invoice}</RecordLink> : "—") },
            { header: "Certificate", cell: (row) => row.certificate ?? "—", wide: true },
            ...(edit
              ? [{ header: "Remove", cell: (row: BatchRow) => (row.sales_invoice || row.certificate ? null : <ActionButton variant="ghost" size="sm" label="Remove" success="Trainee removed" confirm={`Take ${row.trainee_name} off this class?`} action={removeBatchTrainee.bind(null, name, row.name)} />) }]
              : []),
          ]}
          rows={rows}
          rowKey={(row) => row.name}
          empty="No trainees on this class yet"
        />
      </section>
      {invoices.length > 0 && (
        <section>
          <h2 className="mb-1 text-base">Invoices</h2>
          <RecordTable
            columns={[
              { header: "Invoice", cell: (row) => <RecordLink href={`/invoices/${encodeURIComponent(row.name)}`}>{row.name}</RecordLink> },
              { header: "Customer", cell: (row) => row.customer },
              { header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
              { header: "Total", align: "right", cell: (row) => formatKes(row.grand_total) },
              { header: "Unpaid", align: "right", cell: (row) => formatKes(row.outstanding_amount) },
            ]}
            rows={invoices}
            rowKey={(row) => row.name}
            empty=""
          />
        </section>
      )}
    </div>
  )
}
