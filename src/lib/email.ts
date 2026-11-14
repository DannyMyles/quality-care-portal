/** Where a record an email is filed under opens in the portal, and what to call it. */
const PATHS: Record<string, (name: string) => string> = {
  "Sales Invoice": (name) => `/invoices/${encodeURIComponent(name)}`,
  "Purchase Invoice": (name) => `/bills/${encodeURIComponent(name)}`,
  Supplier: (name) => `/suppliers/${encodeURIComponent(name)}`,
  Customer: (name) => `/customers?search=${encodeURIComponent(name)}`,
  Trainee: (name) => `/trainees/${encodeURIComponent(name)}`,
  "Certificate Register": (name) => `/certificates?search=${encodeURIComponent(name)}`,
  "Tractor Hire Log": (name) => `/tractor/${encodeURIComponent(name)}`,
}

const LABELS: Record<string, string> = {
  "Sales Invoice": "Invoice",
  "Purchase Invoice": "Bill",
  "Payment Entry": "Receipt",
  "Certificate Register": "Certificate",
  "Tractor Hire Log": "Tractor job",
}

export function recordPath(doctype?: string | null, name?: string | null) {
  return doctype && name && PATHS[doctype] ? PATHS[doctype](name) : null
}

export function recordLabel(doctype?: string | null) {
  return doctype ? (LABELS[doctype] ?? doctype) : ""
}

/** "Jane Doe <jane@example.com>" -> "Jane Doe". */
export function displayName(sender?: string | null, fullName?: string | null) {
  if (fullName && !fullName.includes("@")) return fullName
  const match = sender?.match(/^\s*"?([^"<]+?)"?\s*</)
  return match?.[1] ?? sender ?? ""
}

/** What an email's delivery state reads as. Received mail has none. */
export function deliveryLabel(row: { sent_or_received: string; delivery_status?: string }) {
  if (row.sent_or_received === "Received") return "Received"
  return row.delivery_status || "Sent"
}
