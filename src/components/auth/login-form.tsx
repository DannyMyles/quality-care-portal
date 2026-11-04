"use client"

import Link from "next/link"
import { useActionState, useState } from "react"
import { PasswordInput } from "@/components/auth/password-input"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LoadingButton } from "@/components/shared/loading-button"
import { signIn } from "@/lib/actions"

export function LoginForm({ next, expired, reset }: { next?: string; expired?: boolean; reset?: boolean }) {
  const [error, action, pending] = useActionState(signIn, null)
  // Controlled, because React clears a form after its action runs and a retry should keep the email.
  const [email, setEmail] = useState("")
  return (
    <form action={action} className="flex flex-col gap-5">
      <div>
        <h2 className="text-2xl font-bold text-[#12133D]">Welcome back</h2>
        <p className="mt-1 text-sm text-[#6A6C8C]">Sign in with your Quality Care account</p>
      </div>
      {reset && !error && (
        <p role="status" className="rounded-xl bg-[#0AC6A2]/15 px-3 py-2 text-sm text-[#056D59]">
          Your password has been changed. Please sign in with the new one.
        </p>
      )}
      {expired && !reset && !error && (
        <p role="status" className="rounded-xl bg-[#00A3E0]/10 px-3 py-2 text-sm text-[#12133D]">
          Your session ended. Please sign in again.
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-xl bg-[#EB2239]/10 px-3 py-2 text-sm font-medium text-[#87000A]">
          {error}
        </p>
      )}
      <input type="hidden" name="next" value={next ?? ""} />
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email address</Label>
        <Input id="email" name="email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} className="h-12 rounded-xl" />
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <Link prefetch={false} href="/forgot-password" className="text-xs font-medium text-[#2E3094] hover:underline">
            Forgot password?
          </Link>
        </div>
        <PasswordInput id="password" name="password" autoComplete="current-password" required className="h-12 rounded-xl" />
      </div>
      <LoadingButton type="submit" loading={pending} loadingText="Signing in" className="h-12 w-full rounded-xl text-sm font-semibold">
        Sign in
      </LoadingButton>
      <p className="text-center text-xs text-[#6A6C8C]">This is the same account you use for Desk.</p>
    </form>
  )
}
