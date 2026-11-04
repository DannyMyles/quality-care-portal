"use client"

import { AlertTriangle, RefreshCw } from "@/components/icons"
import { Button } from "@/components/ui/button"

export function ErrorState({
  title = "Something went wrong",
  description = "We couldn't load this content. Your data is safe — please try again.",
  onRetry,
  compact,
}: {
  title?: string
  description?: string
  onRetry?: () => void
  compact?: boolean
}) {
  return (
    <div className={`mx-auto flex max-w-md flex-col items-center text-center ${compact ? "py-10" : "py-24"}`}>
      <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-[#EB2239]/10 text-[#EB2239]">
        <AlertTriangle className="size-7" />
      </div>
      <h2 className="text-xl">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      {onRetry && (
        <Button onClick={onRetry} className="mt-5">
          <RefreshCw className="size-4" />
          Try again
        </Button>
      )}
    </div>
  )
}
