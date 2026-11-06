import { RankedBars } from "@/components/charts/bars"
import { ChartCard } from "@/components/charts/chart-card"
import { InfoIcon, Wrench } from "@/components/icons"
import { FormDialog, type FormField } from "@/components/forms/form-dialog"
import { FilterBar, SearchFilter, SelectFilter } from "@/components/shared/filters"
import { KpiCard } from "@/components/shared/kpi-card"
import { PageHeader } from "@/components/shared/page-header"
import { PrintLink } from "@/components/shared/print-link"
import { RecordLink, RecordTable } from "@/components/shared/record-table"
import { StatusTabs } from "@/components/shared/status-tabs"
import { createEquipment } from "@/lib/actions"
import { api, getMe } from "@/lib/frappe/client"
import { compactKes, formatDate, formatKes, pageOf } from "@/lib/format"
import type { Page } from "@/lib/frappe/types"

interface Asset {
  name: string
  asset_name: string
  asset_category: string
  location?: string
  purchase_date?: string
  net_purchase_amount: number
}

export default async function EquipmentPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams
  const { page, start, limit } = pageOf(params)
  const me = await getMe()
  const data = await api<Page<Asset> & { categories: { category: string; count: number; value: number }[]; options: { categories: string[]; locations: string[] } }>("equipment", { params: { category: params.category, search: params.search, location: params.location, start, limit } })
  const choices = (values: string[]) => values.map((value) => ({ value, label: value }))
  const fields: FormField[] = [
    { name: "asset_name", label: "Item", required: true, full: true, placeholder: "Adult Manikin #76" },
    { name: "asset_category", label: "Category", type: "select", required: true, options: choices(data.options.categories) },
    { name: "location", label: "Location", type: "select", required: true, initial: data.options.locations.length === 1 ? data.options.locations[0] : undefined, options: choices(data.options.locations) },
    { name: "purchase_date", label: "Bought on", type: "date", required: true },
    { name: "value", label: "Cost (KES)", type: "number", required: true },
    { name: "bought_from", label: "Bought from" },
    { name: "serial_number", label: "Serial number" },
  ]
  const add = me.can.add_equipment ? <FormDialog title="New equipment" description="This adds the item to the register. Nothing posts to the books." triggerLabel="New equipment" trigger="add" success="Equipment saved" fields={fields} action={createEquipment} /> : null
  const total = data.categories.reduce((sum, row) => sum + row.value, 0)
  const count = data.categories.reduce((sum, row) => sum + row.count, 0)
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Equipment" description="Training equipment and office items owned by Quality Care." actions={<><PrintLink report="equipment-register" label="Print register" />{add}</>} />
      <p className="flex items-start gap-2.5 rounded-xl bg-[#00A3E0]/10 px-4 py-3 text-sm">
        <InfoIcon className="mt-0.5 size-4 shrink-0 text-[#0078A8]" />
        This is a register for now. Its value isn&apos;t on the balance sheet until the accountant decides the opening entry.
      </p>
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="flex flex-col gap-5">
          <KpiCard label="Items" value={count} icon={Wrench} />
          <KpiCard label="Purchase value" value={formatKes(total)} icon={Wrench} iconTint="emerald" />
        </div>
        <ChartCard title="Value by category" className="lg:col-span-2" table={{ headers: ["Category", "Items", "Value"], rows: data.categories.map((row) => [row.category, row.count, formatKes(row.value)]) }}>
          <RankedBars rows={data.categories.map((row) => ({ name: row.category, value: row.value, note: `${row.count} items` }))} valueLabel={compactKes} />
        </ChartCard>
      </div>
      <div>
        <StatusTabs path="/equipment" param="category" current={params.category} keep={params} options={[{ value: "", label: "All" }, ...data.categories.map((row) => ({ value: row.category, label: row.category }))]} />
        <FilterBar>
          <SearchFilter placeholder="Search by item or location" />
          {data.options.locations.length > 1 && <SelectFilter param="location" placeholder="All locations" options={choices(data.options.locations)} />}
        </FilterBar>
        <RecordTable
          columns={[
            { header: "Item", cell: (row) => <RecordLink href={`/equipment/${encodeURIComponent(row.name)}`}>{row.asset_name}</RecordLink> },
            { header: "Category", cell: (row) => row.asset_category, wide: true },
            { header: "Location", cell: (row) => row.location ?? "—", wide: true },
            { header: "Bought", cell: (row) => formatDate(row.purchase_date) },
            { header: "Value", align: "right", cell: (row) => formatKes(row.net_purchase_amount, true) },
          ]}
          rows={data.rows}
          rowKey={(row) => row.name}
          empty="No equipment found"
          total={data.total}
          page={page}
          path="/equipment"
          params={params}
        />
      </div>
    </div>
  )
}
