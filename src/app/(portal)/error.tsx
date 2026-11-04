"use client"

import { ErrorState } from "@/components/shared/error-state"

export default function PortalError({ reset }: { reset: () => void }) {
  return <ErrorState description="We couldn't load this page. Nothing has been lost, so please try again." onRetry={reset} />
}
