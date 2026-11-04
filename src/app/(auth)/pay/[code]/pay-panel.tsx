"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { CheckCircle2, Phone } from "@/components/icons"
import { LoadingButton } from "@/components/shared/loading-button"
import { Spinner } from "@/components/shared/spinner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { payRequest, payStatus } from "@/lib/actions"
import { formatKes } from "@/lib/format"

const POLL_MS = 4000
const GIVE_UP_MS = 2 * 60 * 1000

type Stage = { name: "form" } | { name: "waiting"; reference: string } | { name: "paid"; receipt?: string; balance: number } | { name: "failed" } | { name: "timeout" }

export function PayPanel({ code, toPay, paybill }: { code: string; toPay: number; paybill: { type: string; number: string; account: string } | null }) {
  const [stage, setStage] = useState<Stage>({ name: "form" })
  const [phone, setPhone] = useState("")
  const [amount, setAmount] = useState(String(toPay))
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const started = useRef(0)

  useEffect(() => {
    if (stage.name !== "waiting") return
    started.current = Date.now()
    const id = setInterval(async () => {
      const result = await payStatus(code, stage.reference)
      if (result.status === "Paid") setStage({ name: "paid", receipt: result.receipt, balance: result.balance ?? 0 })
      else if (result.status === "Failed") setStage({ name: "failed" })
      else if (Date.now() - started.current > GIVE_UP_MS) setStage({ name: "timeout" })
    }, POLL_MS)
    return () => clearInterval(id)
  }, [stage, code])

  const value = Number(amount)
  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    start(async () => {
      const result = await payRequest(code, phone, value)
      if (result.ok) setStage({ name: "waiting", reference: result.data.reference })
      else setError(result.error)
    })
  }
  const paybillNote = paybill && (
    <p className="text-xs text-[#6A6C8C]">
      Or use Lipa na M-Pesa: {paybill.type} <strong className="text-[#12133D]">{paybill.number}</strong>
      {paybill.type === "Paybill" && <>, account <strong className="text-[#12133D]">{paybill.account}</strong></>}
    </p>
  )

  if (stage.name === "waiting") {
    return (
      <div role="status" className="flex flex-col items-center gap-3 rounded-xl bg-[#F3F4FB] px-4 py-6 text-center">
        <Spinner />
        <p className="font-semibold text-[#12133D]">Check your phone</p>
        <p className="text-sm text-[#5E6182]">Enter your M-Pesa PIN on the prompt to pay {formatKes(value)}. This page updates by itself.</p>
      </div>
    )
  }
  if (stage.name === "paid") {
    return (
      <div role="status" className="flex flex-col items-center gap-2 rounded-xl bg-[#0AC6A2]/15 px-4 py-6 text-center text-[#056D59]">
        <CheckCircle2 className="size-8" />
        <p className="font-semibold">Payment received. Thank you.</p>
        {stage.receipt && <p className="text-sm">M-Pesa receipt {stage.receipt}</p>}
        {stage.balance > 0 && <p className="text-sm">{formatKes(stage.balance, true)} is still due on this invoice.</p>}
      </div>
    )
  }
  if (stage.name === "failed" || stage.name === "timeout") {
    return (
      <div className="flex flex-col gap-3">
        <p role="alert" className="rounded-xl bg-[#F5C400]/20 px-3 py-3 text-sm text-[#755A00]">
          {stage.name === "failed" ? "The payment didn't go through, and you haven't been charged." : "We haven't heard back from M-Pesa yet. If you approved it, you'll get an M-Pesa message, and this invoice will update shortly. Please check that message before trying again."}
        </p>
        <Button variant="outline" onClick={() => setStage({ name: "form" })}>Try again</Button>
        {paybillNote}
      </div>
    )
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {error && <p role="alert" className="rounded-xl bg-[#EB2239]/10 px-3 py-2 text-sm font-medium text-[#87000A]">{error}</p>}
      <div className="flex flex-col gap-2">
        <Label htmlFor="phone">M-Pesa phone number</Label>
        <Input id="phone" type="tel" inputMode="tel" autoComplete="tel" required placeholder="0712 345 678" value={phone} onChange={(event) => setPhone(event.target.value)} className="h-12 rounded-xl" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="amount">Amount (KES)</Label>
        <Input id="amount" type="number" inputMode="numeric" min={1} max={toPay} step={1} required value={amount} onChange={(event) => setAmount(event.target.value)} className="h-12 rounded-xl" />
        {value > 0 && value < toPay && <p className="text-xs text-[#6A6C8C]">You&apos;re paying part of the balance. The rest stays due.</p>}
      </div>
      <LoadingButton type="submit" loading={pending} loadingText="Sending prompt" className="h-12 w-full rounded-xl text-sm font-semibold">
        <Phone className="size-4" />
        Pay {formatKes(value || 0)}
      </LoadingButton>
      {paybillNote}
    </form>
  )
}
