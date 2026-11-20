import { redirect } from "next/navigation"
import { otherCompany } from "@/components/shared/other-company"
import { ImportWizard } from "@/components/import/import-wizard"
import { PageHeader } from "@/components/shared/page-header"
import { StatusTabs } from "@/components/shared/status-tabs"
import { api, getMe } from "@/lib/frappe/client"
import { formatDate } from "@/lib/format"
import type { Batch } from "@/lib/frappe/types"

const COPY = {
  trainees: "Bring your trainee list in from Excel. Anyone already on record is skipped.",
  certificates: "Add past certificates, already issued, with their original dates. Import the trainees first.",
}

export default async function ImportPage({ searchParams }: { searchParams: Promise<{ kind?: string; batch?: string }> }) {
  const me = await getMe()
  const away = otherCompany(me, "training", "Imports")
  if (away) return away
  const options = [
    ...(me.can.import_trainees ? [{ value: "trainees", label: "Trainees" }] : []),
    ...(me.can.import_certificates ? [{ value: "certificates", label: "Certificates" }] : []),
  ]
  if (!options.length) redirect("/no-access")
  const { kind: requested, batch: batchName } = await searchParams
  const kind = (options.some((option) => option.value === requested) ? requested : options[0].value) as keyof typeof COPY
  if (batchName && kind === "trainees") {
    const { batch } = await api<{ batch: Batch }>("batch", { params: { name: batchName } })
    const label = `${batch.course_name ?? batch.course}, ${formatDate(batch.start_date)}${batch.venue ? ` at ${batch.venue}` : ""}`
    return (
      <div>
        <PageHeader title="Import a class list" description={`Into ${label}. New people are added as trainees, and everyone registered for this course goes on the class. People already on record aren't duplicated.`} />
        <ImportWizard kind="trainees" batch={{ name: batch.name, label }} />
      </div>
    )
  }
  return (
    <div>
      <PageHeader title="Import from Excel" description={COPY[kind]} />
      <StatusTabs path="/import" param="kind" current={kind} options={options} />
      <ImportWizard key={kind} kind={kind} />
    </div>
  )
}
