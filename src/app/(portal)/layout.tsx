import { PortalShell } from "@/components/layout/portal-shell"
import { LiveRefresh } from "@/components/shared/live-refresh"
import { api, getMe } from "@/lib/frappe/client"
import { formatKes } from "@/lib/format"
import type { WorkQueue } from "@/lib/frappe/types"

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const me = await getMe()
  const queue = await api<WorkQueue>("work_queue")
  return (
    <PortalShell
      can={me.can}
      desk={me.desk}
      company={me.company}
      companies={me.companies ?? [me.company]}
      userName={me.full_name}
      primaryRole={me.roles[0]?.replace("Quality Care ", "")}
      notifications={queue.items.map((item) => ({
        id: item.key,
        title: `${item.count} ${item.label.toLowerCase()}`,
        description: item.amount ? formatKes(item.amount) : "Open the list",
        href: item.href,
      }))}
    >
      <LiveRefresh />
      {children}
    </PortalShell>
  )
}
