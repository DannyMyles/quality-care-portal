import { DetailList } from "@/components/shared/detail-list"
import { PageHeader } from "@/components/shared/page-header"
import { StatusBadge } from "@/components/shared/status-badge"
import { api } from "@/lib/frappe/client"
import { formatDate, formatKes } from "@/lib/format"

interface Detail {
  name: string
  asset_name: string
  asset_category: string
  location?: string
  purchase_date?: string
  net_purchase_amount: number
  status: string
  cost_center?: string
  details: string[]
}

export default async function EquipmentItemPage({ params }: { params: Promise<{ name: string }> }) {
  const name = decodeURIComponent((await params).name)
  const item = await api<Detail>("equipment_record", { params: { name } })
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={item.asset_name} description={item.name} actions={<StatusBadge status={item.status} />} />
      <DetailList
        rows={[
          { label: "Category", value: item.asset_category },
          { label: "Location", value: item.location },
          { label: "Bought on", value: item.purchase_date ? formatDate(item.purchase_date) : null },
          { label: "Cost", value: formatKes(item.net_purchase_amount, true) },
          { label: "Business line", value: item.cost_center?.replace(/ - QC$/, "") },
        ]}
      />
      {item.details.length > 0 && (
        <div>
          <h2 className="mb-1 font-medium">Details</h2>
          {item.details.map((line) => (
            <p key={line} className="max-w-3xl text-sm text-[#5E6182]">{line}</p>
          ))}
        </div>
      )}
    </div>
  )
}
