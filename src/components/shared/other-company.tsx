import { Building2 } from "@/components/icons"
import { EmptyState } from "@/components/shared/empty-state"
import { PageHeader } from "@/components/shared/page-header"
import { isQualityCare, shortCompany } from "@/lib/company"
import type { Me } from "@/lib/frappe/types"

/** Training and the M-Pesa till are Quality Care's; the tractor is the other company's. */
type Section = "training" | "tractor" | "mpesa"

/**
 * A page typed in or bookmarked while working in the company that doesn't own it says so, rather than
 * showing the other company's records. Null when the page belongs here.
 */
export function otherCompany(me: Me, section: Section, title: string) {
  if (me.companies.length < 2) return null
  const qualityCareOwns = section !== "tractor"
  if (isQualityCare(me.company) === qualityCareOwns) return null
  const owner = me.companies.find((name) => isQualityCare(name) === qualityCareOwns)
  if (!owner) return null
  return (
    <div>
      <PageHeader title={title} />
      <EmptyState
        icon={Building2}
        title={`${title} belong to ${shortCompany(owner)}`}
        description={`You're working in ${shortCompany(me.company)}. Switch to ${shortCompany(owner)} at the top of the page to open ${title.toLowerCase()}.`}
      />
    </div>
  )
}
