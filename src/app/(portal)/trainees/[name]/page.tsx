import { traineeFields } from "@/components/forms/fields"
import { ActionButton } from "@/components/forms/action-button"
import { FormDialog } from "@/components/forms/form-dialog"
import { ChartCard } from "@/components/charts/chart-card"
import { PageHeader } from "@/components/shared/page-header"
import { PrintLink } from "@/components/shared/print-link"
import { RecordLink, RecordTable } from "@/components/shared/record-table"
import { StatusBadge } from "@/components/shared/status-badge"
import { createTraineeCustomer, saveTrainee, type FormValues } from "@/lib/actions"
import { api, getMe } from "@/lib/frappe/client"
import { formatDate, formatKes } from "@/lib/format"
import type { Certificate, Trainee } from "@/lib/frappe/types"

interface Detail {
  trainee: Trainee
  batches: { name: string; course_name: string; start_date: string; status: string; fee: number; completed: number; sales_invoice?: string }[]
  certificates: Certificate[]
}

export default async function TraineePage({ params }: { params: Promise<{ name: string }> }) {
  const name = decodeURIComponent((await params).name)
  const me = await getMe()
  const { trainee, batches, certificates } = await api<Detail>("trainee", { params: { name } })
  const update = async (values: FormValues) => {
    "use server"
    return saveTrainee({ ...values, name })
  }
  const details: [string, string | undefined][] = [
    ["ID or passport", trainee.id_number],
    ["Phone", trainee.phone],
    ["Email", trainee.email],
    ["Profession", trainee.profession],
    ["Registration number", trainee.registration_number],
    ["Billed to", trainee.customer],
  ]
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={trainee.full_name}
        description={trainee.profession}
        actions={
          <>
            {me.can.edit_trainees && !trainee.customer && (
              <ActionButton variant="outline" label="Bill to themselves" success="Customer record created" action={createTraineeCustomer.bind(null, name)} />
            )}
            {me.can.edit_trainees && (
              <FormDialog
                title="Edit trainee"
                triggerLabel="Edit"
                trigger="edit"
                success="Trainee updated"
                fields={traineeFields.filter((field) => field.name !== "customer").map((field) => ({ ...field, initial: trainee[field.name as keyof Trainee] }))}
                action={update}
              />
            )}
          </>
        }
      />
      <ChartCard title="Details">
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {details.map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs text-[#6A6C8C]">{label}</dt>
              <dd className="mt-0.5 text-sm font-medium">{value || "—"}</dd>
            </div>
          ))}
        </dl>
      </ChartCard>
      <section>
        <h2 className="mb-1 text-base">Classes</h2>
        <RecordTable
          columns={[
            { header: "Class", cell: (row) => <RecordLink href={`/batches/${encodeURIComponent(row.name)}`} sub={formatDate(row.start_date)}>{row.course_name}</RecordLink> },
            { header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
            { header: "Finished", cell: (row) => (row.completed ? "Yes" : "No") },
            { header: "Fee", align: "right", cell: (row) => formatKes(row.fee) },
          ]}
          rows={batches}
          rowKey={(row) => row.name}
          empty="Not on any class yet"
        />
      </section>
      <section>
        <h2 className="mb-1 text-base">Certificates</h2>
        <RecordTable
          columns={[
            { header: "Certificate", cell: (row) => row.name },
            { header: "Course", cell: (row) => row.course },
            { header: "Issued", cell: (row) => formatDate(row.issue_date) },
            { header: "Expires", cell: (row) => formatDate(row.expiry_date) },
            { header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
            { header: "PDF", cell: (row) => (row.status === "Issued" ? <PrintLink kind="certificate" name={row.name} label="Download" /> : "—") },
          ]}
          rows={certificates}
          rowKey={(row) => row.name}
          empty="No certificates yet"
        />
      </section>
    </div>
  )
}
