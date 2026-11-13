/** "Quality Care Trainers Holdings Company" reads as "Quality Care", "Highlead Solutions Limited" as "Highlead Solutions". */
export function shortCompany(name: string) {
  if (name.startsWith("Quality Care")) return "Quality Care"
  return name.replace(/\s+(Limited|Ltd\.?|Company)$/i, "")
}

export const isQualityCare = (name: string) => name.startsWith("Quality Care")

/** Menu wording that depends on the company: only Quality Care sells courses. */
export function navLabel(label: string, company: string) {
  return label === "Courses & Services" && !isQualityCare(company) ? "Services" : label
}

/** "Highlead Solutions" -> "HS", for the collapsed sidebar. */
export const initials = (name: string) =>
  shortCompany(name).split(/\s+/).map((word) => word[0]).join("").slice(0, 2).toUpperCase()
