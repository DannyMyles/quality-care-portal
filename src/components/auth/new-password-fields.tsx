"use client"

import { useState } from "react"
import { PasswordInput } from "@/components/auth/password-input"
import { Check, X } from "@/components/icons"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

export const MIN_PASSWORD_LENGTH = 8

function Rule({ met, children }: { met: boolean; children: React.ReactNode }) {
  const Icon = met ? Check : X
  return (
    <li className={cn("flex items-center gap-1.5 text-xs", met ? "text-[#056D59]" : "text-[#6A6C8C]")}>
      <Icon className="size-3.5" />
      {children}
    </li>
  )
}

/** New password twice, with live checks. Frappe's password policy has the final say when it's saved. */
export function NewPasswordFields({ inputClassName, onValidChange }: { inputClassName?: string; onValidChange: (valid: boolean) => void }) {
  const [first, setFirst] = useState("")
  const [second, setSecond] = useState("")
  const update = (a: string, b: string) => {
    setFirst(a)
    setSecond(b)
    onValidChange(a.length >= MIN_PASSWORD_LENGTH && a === b)
  }
  return (
    <>
      <div className="flex flex-col gap-2">
        <Label htmlFor="new_password">New password</Label>
        <PasswordInput id="new_password" name="new_password" autoComplete="new-password" required value={first} onChange={(event) => update(event.target.value, second)} className={inputClassName} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="confirm_password">Repeat new password</Label>
        <PasswordInput id="confirm_password" name="confirm_password" autoComplete="new-password" required value={second} onChange={(event) => update(first, event.target.value)} className={inputClassName} />
      </div>
      <ul className="flex flex-col gap-1">
        <Rule met={first.length >= MIN_PASSWORD_LENGTH}>At least {MIN_PASSWORD_LENGTH} characters</Rule>
        <Rule met={first.length > 0 && first === second}>Both passwords match</Rule>
      </ul>
    </>
  )
}
