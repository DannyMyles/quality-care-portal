import Link from "next/link"
import { ShieldCheck } from "@/components/icons"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"

export default function NoAccessPage() {
  return (
    <EmptyState
      icon={ShieldCheck}
      title="This isn't part of your role"
      description="Ask the Director if you need access to this page."
      action={<Button render={<Link prefetch={false} href="/dashboard" />} nativeButton={false}>Back to dashboard</Button>}
    />
  )
}
