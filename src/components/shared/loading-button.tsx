"use client"

import type { ComponentProps } from "react"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/shared/spinner"

type LoadingButtonProps = ComponentProps<typeof Button> & { loading?: boolean; loadingText?: string }

export function LoadingButton({ loading, loadingText, children, disabled, ...props }: LoadingButtonProps) {
  return (
    <Button disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {loading ? <Spinner /> : null}
      {loading && loadingText ? loadingText : children}
    </Button>
  )
}
