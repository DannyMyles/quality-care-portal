"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { LoadingButton } from "@/components/shared/loading-button"

/** Adds the next rows under the ones on screen, keeping your place on the page. */
export function LoadMoreButton({ href }: { href: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  return (
    <LoadingButton variant="outline" size="sm" loading={pending} loadingText="Loading" onClick={() => start(() => router.push(href, { scroll: false }))}>
      Load more
    </LoadingButton>
  )
}
