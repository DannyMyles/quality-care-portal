"use client"

import { toast } from "sonner"
import { Link2 } from "@/components/icons"
import { Button } from "@/components/ui/button"

/** Copies a link for pasting into WhatsApp or an email. */
export function CopyLink({ url, label, copied }: { url: string; label: string; copied: string }) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      toast.success(copied)
    } catch {
      window.prompt("Copy this link", url)
    }
  }
  return (
    <Button variant="outline" size="sm" onClick={copy}>
      <Link2 className="size-4" />
      {label}
    </Button>
  )
}
