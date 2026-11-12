/** Checked with the data-viz palette validator against the white card surface. */
export const SERIES = { income: "#3D48C8", expenses: "#00A3E0" }
export const GAIN = "#3D48C8"
export const LOSS = "#F07A2E"
export const NEUTRAL = "#8A8DA8"
/** A colour follows its business line everywhere, whatever is filtered. */
export const LINE_COLOURS: Record<string, string> = {
  Training: "#3D48C8",
  "Certificate Sales": "#F07A2E",
  "Tractor Hire": "#00A3E0",
  Administration: "#E5A100",
  // Highlead's lines, in its own fixed order. Checked as a set with the palette validator (CVD and normal vision).
  // Bakery has no figures yet; once it trades it needs a slot, as nine hues can't all be told apart.
  Tractor: "#00A3E0",
  "Rentals - Property 1": "#3D48C8",
  "Rentals - Property 2": "#F07A2E",
  "Rentals - Property 3": "#1BAF7A",
  "Fleet - KCR 446X": "#8A5CD8",
  "Fleet - KDC 655H": "#E87BA4",
  "Petrol Station": "#008300",
}
/** The fixed order keeps orange and amber apart on a donut, where they'd be hard to tell side by side. */
export const LINE_ORDER = [
  "Training", "Certificate Sales", "Tractor Hire",
  "Tractor", "Rentals - Property 1", "Rentals - Property 2", "Rentals - Property 3", "Fleet - KCR 446X", "Fleet - KDC 655H", "Petrol Station", "Bakery",
  "Administration",
]
/** Status colours mean the same thing everywhere, and always appear with the status named beside them. */
export const CERTIFICATE_COLOURS: Record<string, string> = { Issued: "#0F9D7F", Requested: "#E5A100", Rejected: "#E0485C", Revoked: NEUTRAL }
export const CLASS_COLOURS: Record<string, string> = { Planned: "#3D48C8", "In Progress": "#00A3E0", Completed: "#0F9D7F", Cancelled: NEUTRAL }
export const lineColour = (name: string) => LINE_COLOURS[name] ?? NEUTRAL
