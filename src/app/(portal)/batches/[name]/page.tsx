import Link from "next/link"
import { DeleteButton } from "@/components/forms/delete-button"
import { ActionButton } from "@/components/forms/action-button"
import { ClassFeedbackSection } from "@/components/feedback/class-feedback"
import { otherCompany } from "@/components/shared/other-company"
import { CompletedToggle } from "@/components/forms/completed-toggle"
import { FormDialog } from "@/components/forms/form-dialog"
import { KpiCard } from "@/components/shared/kpi-card"
import { PageHeader } from "@/components/shared/page-header"
import { PrintLink } from "@/components/shared/print-link"
import { RecordLink, RecordTable } from "@/components/shared/record-table"
import { StatusBadge } from "@/components/shared/status-badge"
import { addClassTrainer, createTrainerBills, removeClassTrainer, updateClassTrainer } from "@/lib/actions"
import { addBatchTrainee, createBatchInvoices, removeBatchTrainee, requestBatchCertificates, saveBatch, setTraineeCompleted, type FormValues } from "@/lib/actions"
import { api, getMe } from "@/lib/frappe/client"
import { formatDate, formatKes } from "@/lib/format"
import type { Batch, BatchRow, ClassFeedback, ClassTrainerRow } from "@/lib/frappe/types"
import { Award, CheckCircle2, ReceiptText, Upload, UsersRound } from "@/components/icons"

interface Detail {
  batch: Batch & { trainees?: BatchRow[]; instructors?: ClassTrainerRow[] }
  invoices: { name: string; customer: string; grand_total: number; outstanding_amount: number; status: string }[]
  progress: { completed: number; invoiced: number; certified: number; to_invoice: number; to_certify: number }
  feedback: ClassFeedback | null
}

const STATUSES = ["Planned", "In Progress", "Completed", "Cancelled"]
const TRAINER_ROLES = ["Lead instructor", "Instructor", "Assistant"].map((value) => ({ value, label: value }))

export default async function BatchPage({ params }: { params: Promise<{ name: string }> }) {
  const name = decodeURIComponent((await params).name)
  const me = await getMe()
  const away = otherCompany(me, "training", "Classes")
  if (away) return away
  const { batch, invoices, progress, feedback } = await api<Detail>("batch", { params: { name } })
  const rows = batch.trainees ?? []
  const instructors = batch.instructors ?? []
  const unbilled = instructors.filter((row) => !row.purchase_invoice && (row.fee ?? 0) > 0).length
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
            {edit && (
              <FormDialog
                key={JSON.stringify(batch)}
                title="Edit class"
                triggerLabel="Edit class"
                trigger="edit"
                success="Class updated"
                fields={[
                  { name: "start_date", label: "Starts", type: "date", required: true, initial: batch.start_date },
                  { name: "end_date", label: "Ends", type: "date", initial: batch.end_date ?? "" },
                  { name: "venue", label: "Venue", full: true, initial: batch.venue ?? "" },
                  { name: "standard_fee", label: "Fee per trainee (KES)", type: "number", initial: batch.standard_fee ?? "", hint: "For trainees added from now on. Each trainee's own fee is changed on their row." },
                  { name: "cpd_points", label: "CPD points", type: "number", initial: batch.cpd_points ?? "" },
                ]}
                action={setStatus}
              />
            )}
            {me.delete.class && !rows.some((row) => row.sales_invoice || row.certificate) && <DeleteButton kind="class" name={name} what={`this ${batch.course_name ?? batch.course} class`} goTo="/batches" />}
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
              {progress.to_invoice > 0 && me.can.make_invoices && <ActionButton variant="outline" label={`Create invoices (${progress.to_invoice})`} success="Draft invoices created" action={createBatchInvoices.bind(null, name)} />}
              {progress.to_certify > 0 && <ActionButton variant="outline" label={`Request certificates (${progress.to_certify})`} success="Sent to the Director for approval" action={requestBatchCertificates.bind(null, name)} />}
              {me.can.import_trainees && (
                <Link prefetch={false} href={`/import?kind=trainees&batch=${encodeURIComponent(name)}`} className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#E3E5F1] bg-white px-3 text-[13px] font-medium text-[#2E3094] hover:bg-[#F3F4FB]">
                  <Upload className="size-4" />
                  Import list
                </Link>
              )}
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
      <section>
        <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base">Trainers and pay</h2>
            <p className="text-sm text-[#6A6C8C]">Who taught this class and what each is paid. Bills are drafted with the 5% withholding tax taken off.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {me.can.edit_bills && unbilled > 0 && <ActionButton variant="outline" label={`Create trainer bills (${unbilled})`} success="Trainer bills drafted" action={createTrainerBills.bind(null, name)} />}
            {edit && (
              <FormDialog
                title="Add a trainer"
                triggerLabel="Add trainer"
                trigger="add"
                success="Trainer added"
                fields={[
                  { name: "supplier", label: "Trainer", type: "lookup", lookup: "trainer", required: true, full: true, hint: "Trainers are set up as suppliers in the Trainers group." },
                  { name: "role", label: "Role", type: "select", initial: "Instructor", options: TRAINER_ROLES },
                  { name: "fee", label: "Fee (KES)", type: "number", required: true, hint: "Before the 5% withholding tax." },
                ]}
                action={addClassTrainer.bind(null, name)}
              />
            )}
          </div>
        </div>
        <RecordTable
          columns={[
            { header: "Trainer", cell: (row: ClassTrainerRow) => row.trainer_name ?? row.supplier },
            { header: "Role", cell: (row: ClassTrainerRow) => row.role ?? "—" },
            { header: "Fee", align: "right", cell: (row: ClassTrainerRow) => formatKes(row.fee) },
            { header: "Bill", cell: (row: ClassTrainerRow) => (row.purchase_invoice ? (me.can.bills ? <RecordLink href={`/bills/${encodeURIComponent(row.purchase_invoice)}`}>{row.purchase_invoice}</RecordLink> : row.purchase_invoice) : "Not billed") },
            ...(edit
              ? [
                  {
                    header: "",
                    cell: (row: ClassTrainerRow) =>
                      row.purchase_invoice ? null : (
                        <span className="flex gap-1">
                          <FormDialog
                            title={`${row.trainer_name}'s fee`}
                            triggerLabel={`Edit ${row.trainer_name}'s fee`}
                            trigger="edit"
                            success="Trainer updated"
                            fields={[
                              { name: "role", label: "Role", type: "select", initial: row.role ?? "Instructor", options: TRAINER_ROLES },
                              { name: "fee", label: "Fee (KES)", type: "number", required: true, initial: row.fee ?? "" },
                            ]}
                            action={updateClassTrainer.bind(null, name, row.name)}
                          />
                          <ActionButton variant="ghost" size="sm" label="Remove" success="Trainer removed" confirm={`Take ${row.trainer_name} off this class?`} action={removeClassTrainer.bind(null, name, row.name)} />
                        </span>
                      ),
                  },
                ]
              : []),
          ]}
          rows={instructors}
          rowKey={(row) => row.name}
          empty="No trainers recorded for this class"
        />
      </section>
      {feedback && <ClassFeedbackSection batch={name} feedback={feedback} canEdit={edit} />}
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
