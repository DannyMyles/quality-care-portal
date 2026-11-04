import { redirect } from "next/navigation"
import { ImportWizard } from "@/components/import/import-wizard"
import { PageHeader } from "@/components/shared/page-header"
import { StatusTabs } from "@/components/shared/status-tabs"
import { getMe } from "@/lib/frappe/client"

const COPY = {
  trainees: "Bring your trainee list in from Excel. Anyone already on record is skipped.",
  certificates: "Add past certificates, already issued, with their original dates. Import the trainees first.",
}

export default async function ImportPage({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const me = await getMe()
  const options = [
    ...(me.can.import_trainees ? [{ value: "trainees", label: "Trainees" }] : []),
    ...(me.can.import_certificates ? [{ value: "certificates", label: "Certificates" }] : []),
  ]
  if (!options.length) redirect("/no-access")
  const requested = (await searchParams).kind
  const kind = (options.some((option) => option.value === requested) ? requested : options[0].value) as keyof typeof COPY
  return (
    <div>
      <PageHeader title="Import from Excel" description={COPY[kind]} />
      <StatusTabs path="/import" param="kind" current={kind} options={options} />
      <ImportWizard key={kind} kind={kind} />
    </div>
  )
}
