import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F6F7FB] px-6 text-center">
      <p className="font-heading text-8xl font-bold text-[#2E3094]">404</p>
      <h1 className="mt-4 text-2xl">This page doesn&apos;t exist</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        The link may be broken or the page may have moved.
      </p>
      <Button render={<Link prefetch={false} href="/dashboard" />} nativeButton={false} className="mt-6">
        Back to dashboard
      </Button>
    </div>
  )
}
