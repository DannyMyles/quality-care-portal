import { ChangePasswordForm } from "@/components/account/change-password"
import { ChartCard } from "@/components/charts/chart-card"
import { ActionButton } from "@/components/forms/action-button"
import { PageHeader } from "@/components/shared/page-header"
import { signOutEverywhere } from "@/lib/actions"
import { getMe } from "@/lib/frappe/client"

export default async function AccountPage() {
  const me = await getMe()
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="My account" description="Your details, password and where you're signed in." />
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Your details">
          <dl className="flex flex-col gap-4 text-sm">
            <div><dt className="text-xs text-[#6A6C8C]">Name</dt><dd className="mt-0.5 font-medium">{me.full_name}</dd></div>
            <div><dt className="text-xs text-[#6A6C8C]">Email</dt><dd className="mt-0.5 font-medium">{me.email}</dd></div>
            <div><dt className="text-xs text-[#6A6C8C]">Roles</dt><dd className="mt-0.5 font-medium">{me.roles.join(", ") || "None"}</dd></div>
          </dl>
          <p className="mt-4 text-xs text-[#6A6C8C]">A Director can change your access on the Team page.</p>
        </ChartCard>
        <ChartCard title="Signed in elsewhere?">
          <p className="mb-4 text-sm text-[#5E6182]">If you used a shared computer or lost a device, this signs you out of the portal and Desk everywhere, including here.</p>
          <ActionButton variant="outline" label="Sign out everywhere" success="Signed out everywhere" confirm="You'll need to sign in again on every device." action={signOutEverywhere} />
        </ChartCard>
      </div>
      <ChartCard title="Change password">
        <ChangePasswordForm />
      </ChartCard>
    </div>
  )
}
