"use client"

import { useState, type ReactNode } from "react"
import { cn } from "@/lib/utils"

export interface ChartTable {
  headers: string[]
  rows: (string | number)[][]
}

/** Every chart has a table view, so the numbers stay readable without relying on colour. */
export function ChartCard({
  title,
  subtitle,
  table,
  children,
  footer,
  className,
}: {
  title: string
  subtitle?: string
  table?: ChartTable
  children: ReactNode
  footer?: ReactNode
  className?: string
}) {
  const [view, setView] = useState<"chart" | "table">("chart")
  return (
    <section className={cn("flex min-w-0 flex-col rounded-2xl border border-[#EEF0F8] bg-white p-5 shadow-[0_2px_12px_rgba(18,19,61,0.04)]", className)}>
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base leading-snug text-[#12133D]">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-[#6A6C8C]">{subtitle}</p>}
        </div>
        {table && (
          <div role="group" aria-label={`${title}: view`} className="flex shrink-0 rounded-lg bg-[#F1F2FA] p-0.5 text-xs">
            {(["chart", "table"] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={view === option}
                onClick={() => setView(option)}
                className={cn("rounded-md px-2.5 py-1 capitalize transition-colors", view === option ? "bg-white font-medium text-[#12133D] shadow-sm" : "text-[#6A6C8C]")}
              >
                {option}
              </button>
            ))}
          </div>
        )}
      </header>
      <div className="min-w-0 flex-1">
        {view === "chart" || !table ? (
          children
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {table.headers.map((header, index) => (
                    <th key={header} scope="col" className={cn("border-b border-[#EEF0F8] py-2 text-xs font-medium whitespace-nowrap text-[#6A6C8C]", index ? "pl-3 text-right" : "text-left")}>
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row) => (
                  <tr key={String(row[0])}>
                    {row.map((cell, index) => (
                      <td key={index} className={cn("border-b border-[#F4F5FB] py-2", index ? "pl-3 text-right tabular-nums" : "text-left")}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {footer && <footer className="mt-3 text-xs text-[#6A6C8C]">{footer}</footer>}
    </section>
  )
}

export function Legend({ items }: { items: { label: string; colour: string; hatched?: boolean }[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#5E6182]">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="size-2.5 rounded-[3px]"
            style={
              item.hatched
                ? { backgroundImage: `repeating-linear-gradient(45deg, ${item.colour} 0 2px, transparent 2px 4px)`, outline: `1px solid ${item.colour}` }
                : { backgroundColor: item.colour }
            }
          />
          {item.label}
        </li>
      ))}
    </ul>
  )
}
