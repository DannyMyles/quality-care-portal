import type { Metadata } from "next"
import { AlertTriangle, CheckCircle2 } from "@/components/icons"
import { verifyCertificate } from "@/lib/frappe/client"
import { formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "Certificate check", robots: { index: false, follow: false } }

const STATES = {
  Valid: { title: "This certificate is valid", tone: "bg-[#0AC6A2]/15 text-[#056D59]", good: true },
  Expired: { title: "This certificate has expired", tone: "bg-[#F5C400]/20 text-[#755A00]", good: false },
  Revoked: { title: "This certificate was revoked", tone: "bg-[#EB2239]/10 text-[#B5152A]", good: false },
}

/** Public, as this is where the QR code lands. It shows only what's printed on the certificate. */
export default async function VerifyPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const result = await verifyCertificate(code)
  if (!result.found) {
    return (
      <div role="status" className="flex flex-col gap-3">
        <span className="flex size-12 items-center justify-center rounded-full bg-[#EB2239]/10 text-[#B5152A]"><AlertTriangle className="size-6" /></span>
        <h2 className="text-2xl font-bold text-[#12133D]">Certificate not found</h2>
        <p className="text-sm text-[#6A6C8C]">We have no issued certificate matching this code. Please scan the code again, or contact Quality Care.</p>
      </div>
    )
  }
  const state = STATES[result.status]
  const Icon = state.good ? CheckCircle2 : AlertTriangle
  const details: [string, string][] = [
    ["Name", result.trainee],
    ["Course", result.course],
    ["Certificate no", result.certificate],
    ["Issued", formatDate(result.issue_date)],
    ...(result.expiry_date ? ([["Valid until", formatDate(result.expiry_date)]] as [string, string][]) : []),
  ]
  return (
    <div className="flex flex-col gap-5">
      <div role="status" className="flex items-center gap-3">
        <span className={cn("flex size-12 shrink-0 items-center justify-center rounded-full", state.tone)}><Icon className="size-6" /></span>
        <h2 className="text-2xl font-bold text-[#12133D]">{state.title}</h2>
      </div>
      <dl className="flex flex-col gap-3 border-t border-[#EEF0F8] pt-4 text-sm">
        {details.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4">
            <dt className="text-[#6A6C8C]">{label}</dt>
            <dd className="text-right font-medium text-[#12133D]">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-xs text-[#6A6C8C]">Checked against Quality Care&apos;s certificate register just now.</p>
    </div>
  )
}
