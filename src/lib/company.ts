/** "Quality Care Trainers Holdings Company" reads as "Quality Care", "Highlead Solutions Limited" as "Highlead Solutions". */
export function shortCompany(name: string) {
  if (name.startsWith("Quality Care")) return "Quality Care"
  return name.replace(/\s+(Limited|Ltd\.?|Company)$/i, "")
}
