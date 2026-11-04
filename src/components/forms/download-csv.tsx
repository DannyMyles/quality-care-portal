"use client"

import { Download } from "@/components/icons"
import { Button } from "@/components/ui/button"

/** A leading = + - or @ would run as a formula when the file opens in Excel, so it is neutralised. */
function cell(value: string) {
  const safe = /^[=+\-@]/.test(value) && Number.isNaN(Number(value)) ? `'${value}` : value
  return `"${safe.replace(/"/g, '""')}"`
}

export function DownloadCsv({ filename, rows }: { filename: string; rows: string[][] }) {
  const download = () => {
    const url = URL.createObjectURL(new Blob([rows.map((row) => row.map(cell).join(",")).join("\r\n")], { type: "text/csv" }))
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  }
  return (
    <Button variant="outline" onClick={download}>
      <Download className="size-4" />
      Download
    </Button>
  )
}
