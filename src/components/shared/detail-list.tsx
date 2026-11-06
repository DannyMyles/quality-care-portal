import type { ReactNode } from "react"

/** A record's fields as label and value, on a card. Blank values show a dash. */
export function DetailList({ rows }: { rows: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="grid gap-x-8 gap-y-4 rounded-2xl border border-[#E3E5F1] bg-white p-5 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map((row) => (
        <div key={row.label}>
          <dt className="text-xs text-[#6A6C8C]">{row.label}</dt>
          <dd className="mt-0.5 text-sm font-medium break-words text-[#12133D]">{row.value || row.value === 0 ? row.value : "—"}</dd>
        </div>
      ))}
    </dl>
  )
}
