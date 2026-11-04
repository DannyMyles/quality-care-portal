import type { Metadata } from "next"
import { AlertTriangle, CheckCircle2 } from "@/components/icons"
import { getPayInfo } from "@/lib/frappe/client"
import { formatDate, formatKes } from "@/lib/format"
import { PayPanel } from "./pay-panel"

export const metadata: Metadata = { title: "Pay your invoice", robots: { index: false, follow: false } }

/** Public, as customers open this from the link on their invoice. */
export default async function PayPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const invoice = await getPayInfo(code)
  if (!invoice.found) {
    return (
      <div role="status" className="flex flex-col gap-3">
        <span className="flex size-12 items-center justify-center rounded-full bg-[#EB2239]/10 text-[#B5152A]"><AlertTriangle className="size-6" /></span>
        <h2 className="text-2xl font-bold text-[#12133D]">This payment link isn&apos;t valid</h2>
        <p className="text-sm text-[#6A6C8C]">It may be incomplete, or the invoice may have been replaced. Please contact Quality Care for a new link.</p>
      </div>
    )
  }
  const contact = (
    <p className="text-xs text-[#6A6C8C]">Questions? {invoice.contact.phones} | {invoice.contact.email}</p>
  )
  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-sm text-[#6A6C8C]">Invoice for {invoice.customer}</p>
        <h2 className="text-[28px] leading-tight font-bold text-[#12133D] tabular-nums">{formatKes(invoice.balance, true)}</h2>
        <p className="mt-1 text-sm text-[#6A6C8C]">
          {invoice.balance > 0 ? (invoice.due ? <span className={invoice.overdue ? "font-medium text-[#B5152A]" : undefined}>{invoice.overdue ? "Was due" : "Due"} {formatDate(invoice.due)}</span> : "Balance due") : "Nothing left to pay"}
        </p>
      </div>
      <dl className="flex flex-col gap-2 border-y border-[#EEF0F8] py-3 text-sm">
        <div className="flex justify-between gap-4"><dt className="text-[#6A6C8C]">Invoice</dt><dd className="font-medium">{invoice.number}</dd></div>
        {invoice.items.map((item, index) => (
          <div key={`${item.name}${index}`} className="flex justify-between gap-4"><dt className="text-[#6A6C8C]">{item.name}</dt><dd className="font-medium tabular-nums">{formatKes(item.amount)}</dd></div>
        ))}
        {invoice.total !== invoice.balance && <div className="flex justify-between gap-4"><dt className="text-[#6A6C8C]">Invoice total</dt><dd className="font-medium tabular-nums">{formatKes(invoice.total, true)}</dd></div>}
      </dl>
      {invoice.balance <= 0 ? (
        <div role="status" className="flex items-center gap-3 rounded-xl bg-[#0AC6A2]/15 px-3 py-3 text-sm text-[#056D59]">
          <CheckCircle2 className="size-5 shrink-0" />
          This invoice is paid in full. Thank you.
        </div>
      ) : invoice.mpesa ? (
        <PayPanel code={code} toPay={invoice.to_pay} paybill={invoice.paybill} />
      ) : (
        <p role="status" className="rounded-xl bg-[#F5C400]/20 px-3 py-3 text-sm text-[#755A00]">Online payment isn&apos;t available right now. Please contact us to arrange payment.</p>
      )}
      {contact}
    </div>
  )
}
