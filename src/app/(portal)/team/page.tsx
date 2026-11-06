import { InfoIcon, UsersRound } from "@/components/icons"
import { ActionButton } from "@/components/forms/action-button"
import { FormDialog, type FormField } from "@/components/forms/form-dialog"
import { PageHeader } from "@/components/shared/page-header"
import { RecordTable } from "@/components/shared/record-table"
import { StatusBadge } from "@/components/shared/status-badge"
import { createTeamMember, sendInvite, updateTeamMember } from "@/lib/actions"
import { api } from "@/lib/frappe/client"
import { formatDate } from "@/lib/format"

interface Member {
  name: string
  full_name?: string
  email: string
  last_login?: string
  roles: string[]
  profiles: string[]
  enabled: number
  editable: boolean
}

export default async function TeamPage() {
  const { users, email_ready: emailReady, profiles } = await api<{ users: Member[]; email_ready: boolean; profiles: string[] }>("team")
  const fields: FormField[] = [
    { name: "full_name", label: "Full name", required: true, full: true },
    { name: "email", label: "Email", type: "email", required: true, full: true, hint: "They sign in with this address." },
    { name: "role_profiles", label: "Role profile", type: "checks", required: true, full: true, options: profiles.map((profile) => ({ value: profile, label: profile })), hint: "Role profiles are set up in Desk." },
  ]
  const add = (
    <FormDialog
      title="New team member"
      description={emailReady ? "They'll get a welcome email to choose their password." : "They can't sign in until they get a welcome email, and email isn't set up yet."}
      triggerLabel="New team member"
      trigger="add"
      success={emailReady ? "Added, and welcome email sent" : "Added. Send their welcome email once email is set up"}
      fields={fields}
      action={createTeamMember}
    />
  )
  return (
    <div>
      <PageHeader title="Team" description="Add colleagues, then send a welcome email so they can choose their own password." actions={add} />
      {!emailReady && (
        <p className="mb-4 flex items-start gap-2.5 rounded-xl bg-[#F5C400]/20 px-4 py-3 text-sm">
          <InfoIcon className="mt-0.5 size-4 shrink-0" />
          Email isn&apos;t set up yet, so welcome emails can&apos;t be sent. Add an outgoing email account in Desk first.
        </p>
      )}
      <RecordTable
        columns={[
          { header: "Name", cell: (row) => <div><p className="font-medium">{row.full_name || row.name}</p><p className="mt-0.5 text-xs text-[#6A6C8C]">{row.email}</p></div> },
          { header: "Access", wide: true, cell: (row) => <span className="whitespace-normal">{(row.profiles.length ? row.profiles : row.roles.map((role) => role.replace("Quality Care ", ""))).join(", ")}</span> },
          { header: "Status", cell: (row) => (!row.enabled ? <StatusBadge status="Deactivated" /> : row.last_login ? <span className="text-sm">Last signed in {formatDate(row.last_login)}</span> : <StatusBadge status="Never signed in" />) },
          {
            header: "Welcome email",
            cell: (row) => !row.enabled ? null : <ActionButton size="sm" variant={row.last_login ? "outline" : "default"} label={row.last_login ? "Send again" : "Send"} success={`Welcome email sent to ${row.email}`} confirm={`Email ${row.email} a link to choose a password? Their current password keeps working until they use it.`} action={sendInvite.bind(null, row.name)} />,
          },
          {
            header: "",
            cell: (row) =>
              row.editable ? (
                <FormDialog
                  key={JSON.stringify(row)}
                  title={`Edit ${row.full_name || row.name}`}
                  triggerLabel="Edit"
                  trigger="edit"
                  success="Access updated"
                  fields={[
                    { ...fields[2], initial: row.profiles.join(","), hint: "Saving replaces the roles they have now with the ones in these profiles." },
                    { name: "enabled", label: "Access", type: "select", required: true, full: true, initial: String(row.enabled), options: [{ value: "1", label: "Active" }, { value: "0", label: "Deactivated" }], hint: "Deactivating signs them out straight away." },
                  ]}
                  action={updateTeamMember.bind(null, row.name)}
                />
              ) : null,
          },
        ]}
        rows={users}
        rowKey={(row) => row.name}
        empty="No colleagues yet"
        emptyDescription="Add your first colleague to get started."
        emptyIcon={UsersRound}
      />
      <p className="mt-3 text-xs text-[#6A6C8C]">What each role can see is set in the full system&apos;s Role Permissions Manager. You can&apos;t change your own access here.</p>
    </div>
  )
}
