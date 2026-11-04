import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const GOOD = "bg-[#0AC6A2]/15 text-[#056D59] border-transparent"
const WARN = "bg-[#F5C400]/20 text-[#755A00] border-transparent"
const BAD = "bg-[#EB2239]/10 text-[#B5152A] border-transparent"
const INFO = "bg-[#2E3094]/10 text-[#2E3094] border-transparent"
const MUTED = "bg-slate-100 text-slate-600 border-transparent"

const STYLES: Record<string, string> = {
  Issued: GOOD, Paid: GOOD, Posted: GOOD, Completed: GOOD, Applied: GOOD, Invoiced: GOOD, Signed: GOOD,
  Requested: WARN, "Never signed in": WARN, Draft: WARN, "To Invoice": WARN, Unpaid: WARN, "Partly Paid": WARN, Sent: WARN, Received: WARN, Submitted: INFO,
  Overdue: BAD, Reversed: BAD, Rejected: BAD, Unmatched: BAD, Failed: BAD, Revoked: BAD, "Not signed": BAD,
  Planned: INFO, "In Progress": INFO, Return: MUTED, "Credit Note Issued": MUTED, Cancelled: MUTED,
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <Badge variant="outline" className={cn("px-2.5 font-medium", STYLES[status] ?? MUTED, className)}>
      {status}
    </Badge>
  )
}
