import { GraduationCap } from "@/components/icons"
import { FormDialog, type FormField } from "@/components/forms/form-dialog"
import { FilterBar, SearchFilter } from "@/components/shared/filters"
import { PageHeader } from "@/components/shared/page-header"
import { RecordTable } from "@/components/shared/record-table"
import { setItemPrice } from "@/lib/actions"
import { api, getMe } from "@/lib/frappe/client"
import { formatKes, pageOf } from "@/lib/format"
import type { Page } from "@/lib/frappe/types"

interface Item {
  name: string
  item_name: string
  item_group: string
  stock_uom: string
  standard_rate?: number
  is_sales_item: number
  is_purchase_item: number
}

const priceFields = (row: Item): FormField[] => [
  { name: "standard_rate", label: "Standard price (KES)", type: "number", required: true, full: true, initial: row.standard_rate ?? 0, hint: "Classes and tractor jobs start from this, and it can still be changed on each one. Enter 0 for no standard price." },
]

export default async function ServicesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams
  const { page, start, limit } = pageOf(params)
  const me = await getMe()
  const data = await api<Page<Item>>("items", { params: { search: params.search, start, limit } })
  return (
    <div>
      <PageHeader title="Courses & Services" description="What Quality Care sells, and the trainer fee it pays." />
      <FilterBar>
        <SearchFilter placeholder="Search by name or group" />
      </FilterBar>
      <RecordTable
        columns={[
          { header: "Name", cell: (row) => <span className="font-medium">{row.item_name}</span> },
          { header: "Group", cell: (row) => row.item_group },
          { header: "Used for", cell: (row) => (row.is_sales_item ? "Sales" : row.is_purchase_item ? "Purchases" : "—") },
          { header: "Charged per", cell: (row) => row.stock_uom, wide: true },
          { header: "Standard price", align: "right", cell: (row) => (row.standard_rate ? formatKes(row.standard_rate) : "Set per class or job") },
          ...(me.can.edit_items
            ? [{
                header: "",
                // Keyed on the price so that the form reopens showing what was just saved.
                cell: (row: Item) => <FormDialog key={`${row.name}:${row.standard_rate}`} title={`Edit price: ${row.item_name}`} triggerLabel="Edit price" trigger="edit" success="Price saved" fields={priceFields(row)} action={setItemPrice.bind(null, row.name)} />,
              }]
            : []),
        ]}
        rows={data.rows}
        rowKey={(row) => row.name}
        empty="Nothing found"
        emptyIcon={GraduationCap}
        total={data.total}
        page={page}
        path="/services"
        params={params}
      />
    </div>
  )
}
