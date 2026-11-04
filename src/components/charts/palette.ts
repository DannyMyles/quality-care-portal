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
}
/** The fixed order keeps orange and amber apart on a donut, where they'd be hard to tell side by side. */
export const LINE_ORDER = ["Training", "Certificate Sales", "Tractor Hire", "Administration"]
/** Status colours mean the same thing everywhere, and always appear with the status named beside them. */
export const CERTIFICATE_COLOURS: Record<string, string> = { Issued: "#0F9D7F", Requested: "#E5A100", Rejected: "#E0485C", Revoked: NEUTRAL }
export const CLASS_COLOURS: Record<string, string> = { Planned: "#3D48C8", "In Progress": "#00A3E0", Completed: "#0F9D7F", Cancelled: NEUTRAL }
export const lineColour = (name: string) => LINE_COLOURS[name] ?? NEUTRAL
