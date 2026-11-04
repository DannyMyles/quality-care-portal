"use client"

import Link from "next/link"
import { useState, useTransition } from "react"
import { AlertTriangle, CheckCircle2, Download, Upload } from "@/components/icons"
import { LoadingButton } from "@/components/shared/loading-button"
import { Button } from "@/components/ui/button"
import { commitImport, previewImport, type ImportPreview, type ImportResult } from "@/lib/actions"

const panel = "rounded-2xl border border-[#EEF0F8] bg-white p-5 shadow-[0_2px_12px_rgba(18,19,61,0.04)]"
const NOUN = { trainees: "trainee", certificates: "certificate" }

function ProblemTable({ rows }: { rows: { row: number; name: string; message: string; type?: string }[] }) {
  return (
    <div className="mt-3 max-h-96 overflow-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-[#6A6C8C]">
            <th scope="col" className="py-2 pr-3 font-medium">Row</th>
            <th scope="col" className="py-2 pr-3 font-medium">Name</th>
            <th scope="col" className="py-2 font-medium">What to fix</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.row} className="border-t border-[#F4F5FB]">
              <td className="py-2 pr-3 tabular-nums">{row.row}</td>
              <td className="py-2 pr-3">{row.name || "—"}</td>
              <td className="py-2">{row.type === "duplicate" ? <span className="text-[#6A6C8C]">Skipped: {row.message}</span> : row.message}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Upload, see exactly what will happen to every row, then confirm. Nothing saves before the confirm. */
export function ImportWizard({ kind }: { kind: "trainees" | "certificates" }) {
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const noun = NOUN[kind]
  const reset = () => {
    setPreview(null)
    setResult(null)
    setError(null)
  }
  const upload = (form: FormData) => {
    setError(null)
    start(async () => {
      form.set("kind", kind)
      const response = await previewImport(form)
      if (response.ok) setPreview(response.data)
      else setError(response.error)
    })
  }
  const confirm = () =>
    start(async () => {
      const response = await commitImport(kind, preview!.token)
      if (response.ok) {
        setResult(response.data)
        setPreview(null)
      } else {
        setError(response.error)
        setPreview(null)
      }
    })

  if (result) {
    return (
      <section className={panel}>
        <div role="status" className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-full bg-[#0AC6A2]/15 text-[#068A70]"><CheckCircle2 className="size-6" /></span>
          <h2 className="text-lg">{result.created} {noun}{result.created === 1 ? "" : "s"} added</h2>
        </div>
        {result.failed.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-medium">{result.failed.length} couldn&apos;t be saved:</p>
            <ProblemTable rows={result.failed} />
          </div>
        )}
        <div className="mt-5 flex gap-2">
          <Button render={<Link prefetch={false} href={kind === "trainees" ? "/trainees" : "/certificates?status=Issued"} />} nativeButton={false}>View {noun}s</Button>
          <Button variant="outline" onClick={reset}>Import another file</Button>
        </div>
      </section>
    )
  }

  if (preview) {
    const errors = preview.problems.filter((problem) => problem.type === "error").length
    const skipped = preview.problems.length - errors
    return (
      <section className={panel}>
        <h2 className="text-lg">Check before importing</h2>
        <ul className="mt-3 flex flex-wrap gap-3 text-sm">
          <li className="rounded-xl bg-[#0AC6A2]/15 px-3 py-2 text-[#056D59]"><strong>{preview.ready}</strong> ready to add</li>
          <li className="rounded-xl bg-[#F1F2FA] px-3 py-2"><strong>{skipped}</strong> already on record</li>
          <li className="rounded-xl bg-[#EB2239]/10 px-3 py-2 text-[#87000A]"><strong>{errors}</strong> need fixing</li>
        </ul>
        {preview.problems.length > 0 && (
          <div className="mt-4">
            <p className="flex items-center gap-2 text-sm font-medium"><AlertTriangle className="size-4" />These rows won&apos;t be added. You can fix them and import them later.</p>
            <ProblemTable rows={preview.problems} />
          </div>
        )}
        {kind === "certificates" && preview.ready > 0 && <p className="mt-4 text-sm text-[#5E6182]">These will be added as already issued, under your name as approver.</p>}
        <div className="mt-5 flex gap-2">
          {preview.ready > 0 && <LoadingButton loading={pending} loadingText="Importing" onClick={confirm}>Add {preview.ready} {noun}{preview.ready === 1 ? "" : "s"}</LoadingButton>}
          <Button variant="outline" onClick={reset}>Choose another file</Button>
        </div>
      </section>
    )
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className={panel}>
        <h2 className="text-base">1. Get the template</h2>
        <p className="mt-1 mb-4 text-sm text-[#6A6C8C]">Use these column headings. A second sheet explains how to fill it in.</p>
        <a href={`/import/template/${kind}`} className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#E3E5F1] bg-white px-3 text-[13px] font-medium text-[#2E3094] hover:bg-[#F3F4FB]">
          <Download className="size-4" />
          Download template
        </a>
      </section>
      <section className={panel}>
        <h2 className="text-base">2. Upload your file</h2>
        <p className="mt-1 mb-4 text-sm text-[#6A6C8C]">Excel or CSV, up to 1,000 rows. You&apos;ll check the results before anything is saved.</p>
        <form action={upload} className="flex flex-wrap items-center gap-3">
          <label htmlFor="import-file" className="sr-only">File to import</label>
          <input id="import-file" name="file" type="file" required accept=".xlsx,.csv" className="min-w-0 flex-1 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-[#F1F2FA] file:px-3 file:py-2 file:text-[13px] file:font-medium" />
          <LoadingButton type="submit" loading={pending} loadingText="Checking">
            <Upload className="size-4" />
            Check file
          </LoadingButton>
        </form>
        {error && <p role="alert" className="mt-3 rounded-lg bg-[#EB2239]/10 px-3 py-2 text-sm text-[#87000A]">{error}</p>}
      </section>
    </div>
  )
}
