import Link from "next/link"
import { ResetPasswordForm } from "./form"

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ key?: string; welcome?: string }> }) {
  const { key, welcome } = await searchParams
  if (!key) {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-2xl font-bold text-[#12133D]">This link isn&apos;t complete</h2>
        <p className="text-sm text-[#6A6C8C]">Open the full link from your email, or request a new one.</p>
        <Link prefetch={false} href="/forgot-password" className="text-sm font-medium text-[#2E3094] hover:underline">Request a new link</Link>
      </div>
    )
  }
  return <ResetPasswordForm resetKey={key} welcome={!!welcome} />
}
