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
      badges={me.mail?.inbox ? { "/inbox": me.mail.unread } : undefined}
      userName={me.full_name}
      primaryRole={me.roles[0]?.replace("Quality Care ", "")}
      notifications={[
        ...(me.mail?.inbox && me.mail.unread
          ? [{ id: "unread-email", title: `${me.mail.unread} unread email${me.mail.unread === 1 ? "" : "s"}`, description: "Open the inbox", href: "/inbox" }]
          : []),
        ...queue.items.map((item) => ({
          id: item.key,
          title: `${item.count} ${item.label.toLowerCase()}`,
          description: item.amount ? formatKes(item.amount) : "Open the list",
          href: item.href,
        })),
      ]}
    >
      <LiveRefresh />
      {children}
    </PortalShell>
  )
}
