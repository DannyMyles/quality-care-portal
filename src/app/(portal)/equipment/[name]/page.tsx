import { FormDialog } from "@/components/forms/form-dialog"
import { DetailList } from "@/components/shared/detail-list"
import { PageHeader } from "@/components/shared/page-header"
import { RecordLink, RecordTable } from "@/components/shared/record-table"
import { StatusBadge } from "@/components/shared/status-badge"
import { setHireRates } from "@/lib/actions"
import { api, getMe } from "@/lib/frappe/client"
import { formatDate, formatKes } from "@/lib/format"

interface HireLine {
  name: string
  hire_date: string
  customer: string
  status: string
  return_date?: string
  condition_out: string
  condition_in?: string
  amount: number
}

interface Detail {
  name: string
  asset_name: string
  asset_category: string
  item_code: string
  location?: string
  purchase_date?: string
  net_purchase_amount: number
  status: string
  cost_center?: string
  details: string[]
  rates: { day: number; week: number }
  hires: HireLine[]
}

export default async function EquipmentItemPage({ params }: { params: Promise<{ name: string }> }) {
  const name = decodeURIComponent((await params).name)
  const [item, me] = await Promise.all([api<Detail>("equipment_record", { params: { name } }), getMe()])
  const rate = (value: number, unit: string) => (value ? `${formatKes(value)} a ${unit}` : "Not set")
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={item.asset_name}
        description={item.name}
        actions={
          <>
            <StatusBadge status={item.status} />
            {me.can.edit_items && (
              <FormDialog
                title={`Hire rates for ${item.item_code}`}
                description={`These apply to every ${item.item_code}. A hire uses them unless a Director approves a negotiated rate.`}
                triggerLabel="Hire rates"
                showPlus={false}
                variant="outline"
                success="Hire rates saved"
                fields={[
                  { name: "day", label: "Per day (KES)", type: "number", initial: item.rates.day || "" },
                  { name: "week", label: "Per week (KES)", type: "number", initial: item.rates.week || "", hint: "Leave blank if it isn't hired by the week." },
                ]}
                action={setHireRates.bind(null, item.item_code)}
              />
            )}
          </>
        }
      />
      <DetailList
        rows={[
          { label: "Category", value: item.asset_category },
          { label: "Location", value: item.location },
          { label: "Bought on", value: item.purchase_date ? formatDate(item.purchase_date) : null },
          { label: "Cost", value: formatKes(item.net_purchase_amount, true) },
          { label: "Business line", value: item.cost_center?.replace(/ - QC$/, "") },
          { label: "Hire rate", value: `${rate(item.rates.day, "day")} · ${rate(item.rates.week, "week")}` },
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
      {me.can.hires && (
        <section>
          <h2 className="mb-1 text-base">Hires</h2>
          <RecordTable
            columns={[
              { header: "Hire", cell: (row: HireLine) => <RecordLink href={`/hires/${encodeURIComponent(row.name)}`} sub={row.name}>{row.customer}</RecordLink> },
              { header: "Hired", cell: (row: HireLine) => formatDate(row.hire_date) },
              { header: "Returned", cell: (row: HireLine) => (row.return_date ? formatDate(row.return_date) : <StatusBadge status="Out" />) },
              { header: "Condition", cell: (row: HireLine) => `${row.condition_out} → ${row.condition_in ?? "…"}` },
              { header: "Charged", align: "right", cell: (row: HireLine) => formatKes(row.amount) },
            ]}
            rows={item.hires}
            rowKey={(row) => row.name}
            empty="Not hired out yet"
          />
        </section>
      )}
    </div>
  )
}
