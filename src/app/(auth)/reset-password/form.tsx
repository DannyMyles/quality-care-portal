"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { NewPasswordFields } from "@/components/auth/new-password-fields"
import { LoadingButton } from "@/components/shared/loading-button"
import { resetPassword } from "@/lib/actions"

export function ResetPasswordForm({ resetKey, welcome }: { resetKey: string; welcome?: boolean }) {
  const router = useRouter()
  const [valid, setValid] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const password = String(new FormData(event.currentTarget).get("new_password") ?? "")
    setError(null)
    start(async () => {
      const result = await resetPassword(resetKey, password)
      if (result.ok) router.replace("/login?reset=1")
      else setError(result.error)
    })
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <div>
        <h2 className="text-2xl font-bold text-[#12133D]">{welcome ? "Welcome to Quality Care" : "Set a new password"}</h2>
        <p className="mt-1 text-sm text-[#6A6C8C]">{welcome ? "Choose a password to finish setting up your account." : "This also signs you out on your other devices."}</p>
      </div>
      {error && (
        <p role="alert" className="rounded-xl bg-[#EB2239]/10 px-3 py-2 text-sm font-medium text-[#87000A]">
          {error}{" "}
          {/expired|used/.test(error) && <Link prefetch={false} href="/forgot-password" className="underline">Request a new link</Link>}
        </p>
      )}
      <NewPasswordFields inputClassName="h-12 rounded-xl" onValidChange={setValid} />
      <LoadingButton type="submit" disabled={!valid} loading={pending} loadingText="Saving" className="h-12 w-full rounded-xl text-sm font-semibold">
        Save new password
      </LoadingButton>
    </form>
  )
}
