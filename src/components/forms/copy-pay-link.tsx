"use client"

import { toast } from "sonner"
import { Link2 } from "@/components/icons"
import { Button } from "@/components/ui/button"

/** For pasting into WhatsApp or an email to the customer. */
export function CopyPayLink({ url }: { url: string }) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      toast.success("Pay Now link copied. Paste it to the customer.")
    } catch {
      window.prompt("Copy this link", url)
    }
  }
  return (
    <Button variant="outline" onClick={copy}>
      <Link2 className="size-4" />
      Copy Pay Now link
    </Button>
  )
}
