export const FRAPPE_URL = process.env.FRAPPE_URL ?? "http://127.0.0.1:8000"
export const FRAPPE_SITE = process.env.FRAPPE_SITE ?? "qualitycare"
export const FRAPPE_PUBLIC_URL = process.env.FRAPPE_PUBLIC_URL ?? FRAPPE_URL
/** The versioned API. A breaking change means moving this to v2. */
export const API_BASE = `${FRAPPE_URL}/api/method/quality_care.api.v1`
export const siteHeaders = { "X-Frappe-Site-Name": FRAPPE_SITE, Accept: "application/json" }
