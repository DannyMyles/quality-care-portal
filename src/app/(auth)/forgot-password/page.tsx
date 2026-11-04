"use client"

import Link from "next/link"
import { useActionState } from "react"
import { CheckCircle2 } from "@/components/icons"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LoadingButton } from "@/components/shared/loading-button"
import { forgotPassword } from "@/lib/actions"

export default function ForgotPasswordPage() {
  const [state, action, pending] = useActionState(forgotPassword, null)
  const back = (
    <Link prefetch={false} href="/login" className="text-center text-sm font-medium text-[#2E3094] hover:underline">
      Back to sign in
    </Link>
  )
  if (state?.sent) {
    return (
      <div className="flex flex-col gap-5">
        <span className="flex size-12 items-center justify-center rounded-full bg-[#0AC6A2]/15 text-[#068A70]">
          <CheckCircle2 className="size-6" />
        </span>
        <div role="status">
          <h2 className="text-2xl font-bold text-[#12133D]">Check your email</h2>
          <p className="mt-2 text-sm text-[#6A6C8C]">If that email is registered, a reset link is on its way. It works once and expires soon. Nothing there? Check your spam folder or ask the Director.</p>
        </div>
        {back}
      </div>
    )
  }
  return (
    <form action={action} className="flex flex-col gap-5">
      <div>
        <h2 className="text-2xl font-bold text-[#12133D]">Forgot your password?</h2>
        <p className="mt-1 text-sm text-[#6A6C8C]">Enter your email and we&apos;ll send you a link to set a new one.</p>
      </div>
      {state?.error && <p role="alert" className="rounded-xl bg-[#EB2239]/10 px-3 py-2 text-sm font-medium text-[#87000A]">{state.error}</p>}
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email address</Label>
        <Input id="email" name="email" type="email" autoComplete="username" required className="h-12 rounded-xl" />
      </div>
      <LoadingButton type="submit" loading={pending} loadingText="Sending" className="h-12 w-full rounded-xl text-sm font-semibold">
        Send reset link
      </LoadingButton>
      {back}
    </form>
  )
}
