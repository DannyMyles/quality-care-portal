"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { NewPasswordFields } from "@/components/auth/new-password-fields"
import { PasswordInput } from "@/components/auth/password-input"
import { Label } from "@/components/ui/label"
import { LoadingButton } from "@/components/shared/loading-button"
import { changePassword } from "@/lib/actions"

export function ChangePasswordForm() {
  const [valid, setValid] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)
  const [pending, start] = useTransition()
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setError(null)
    start(async () => {
      const result = await changePassword(String(form.get("old_password") ?? ""), String(form.get("new_password") ?? ""))
      if (!result.ok) {
        setError(result.error)
        return
      }
      toast.success("Password changed. Your other devices have been signed out.")
      setValid(false)
      setVersion((value) => value + 1)
    })
  }
  return (
    <form key={version} onSubmit={submit} className="flex max-w-md flex-col gap-4">
      {error && <p role="alert" className="rounded-lg bg-[#EB2239]/10 px-3 py-2 text-sm text-[#87000A]">{error}</p>}
      <div className="flex flex-col gap-2">
        <Label htmlFor="old_password">Current password</Label>
        <PasswordInput id="old_password" name="old_password" autoComplete="current-password" required />
      </div>
      <NewPasswordFields onValidChange={setValid} />
      <div>
        <LoadingButton type="submit" disabled={!valid} loading={pending} loadingText="Saving">Change password</LoadingButton>
      </div>
    </form>
  )
}
