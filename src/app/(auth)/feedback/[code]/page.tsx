import type { Metadata } from "next"
import { AlertTriangle } from "@/components/icons"
import { getFeedbackInfo } from "@/lib/frappe/client"
import { formatDate } from "@/lib/format"
import { FeedbackForm } from "./feedback-form"

export const metadata: Metadata = { title: "Feedback on your training", robots: { index: false, follow: false } }

/** Public: students open this from the link or QR code their class was given. */
export default async function FeedbackPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const info = await getFeedbackInfo(code)
  const contact = <p className="text-xs text-[#6A6C8C]">Questions? {info.contact.phones} | {info.contact.email}</p>
  if (!info.found) {
    return (
      <div role="status" className="flex flex-col gap-3">
        <span className="flex size-12 items-center justify-center rounded-full bg-[#EB2239]/10 text-[#B5152A]"><AlertTriangle className="size-6" /></span>
        <h2 className="text-2xl font-bold text-[#12133D]">This feedback link isn&apos;t valid</h2>
        <p className="text-sm text-[#6A6C8C]">It may be incomplete. Please ask your trainer for the link again.</p>
        {contact}
      </div>
    )
  }
  const dates = info.end_date && info.end_date !== info.start_date ? `${formatDate(info.start_date)} to ${formatDate(info.end_date)}` : formatDate(info.start_date)
  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-sm text-[#6A6C8C]">How was your training?</p>
        <h2 className="text-[26px] leading-tight font-bold text-[#12133D]">{info.course}</h2>
        <p className="mt-1 text-sm text-[#6A6C8C]">{dates}{info.venue ? ` · ${info.venue}` : ""}</p>
      </div>
      {info.closed ? <p role="status" className="rounded-xl bg-[#F5C400]/20 px-3 py-3 text-sm text-[#755A00]">{info.closed}</p> : <FeedbackForm code={code} />}
      {contact}
    </div>
  )
}
