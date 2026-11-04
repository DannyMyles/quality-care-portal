import { Building2 } from "@/components/icons"
import { DeskLink } from "@/components/shared/desk-link"
import { FilterBar, SearchFilter } from "@/components/shared/filters"
import { PageHeader } from "@/components/shared/page-header"
import { RecordTable, type Column } from "@/components/shared/record-table"
import { api, getMe } from "@/lib/frappe/client"
import { formatKes, pageOf } from "@/lib/format"
import type { Page } from "@/lib/frappe/types"

interface Supplier {
  name: string
  supplier_name: string
  supplier_group?: string
  tax_id?: string
  tax_withholding_category?: string
  supplier_details?: string
  balance?: number
}

export default async function SuppliersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams
  const { page, start, limit } = pageOf(params)
  const me = await getMe()
  const data = await api<Page<Supplier>>("suppliers", { params: { search: params.search, start, limit } })
  const columns: Column<Supplier>[] = [
    { header: "Supplier", cell: (row) => <div><p className="font-medium">{row.supplier_name}</p>{row.supplier_details && <p className="mt-0.5 max-w-md text-xs whitespace-normal text-[#6A6C8C]">{row.supplier_details}</p>}</div> },
    { header: "Group", cell: (row) => row.supplier_group ?? "—", wide: true },
    { header: "KRA PIN", cell: (row) => row.tax_id ?? "—" },
    { header: "Withholding tax", cell: (row) => row.tax_withholding_category ?? "None", wide: true },
    ...(me.can.finance ? [{ header: "We owe", align: "right" as const, cell: (row: Supplier) => formatKes(row.balance) }] : []),
    { header: "Desk", wide: true, cell: (row) => <DeskLink doctype="Supplier" name={row.name} label="Open" /> },
  ]
  return (
    <div>
      <PageHeader title="Suppliers" description="Trainers and everyone else Quality Care pays." />
      <FilterBar>
        <SearchFilter placeholder="Search by name, PIN or group" />
      </FilterBar>
      <RecordTable columns={columns} rows={data.rows} rowKey={(row) => row.name} empty="No suppliers found" emptyIcon={Building2} total={data.total} page={page} path="/suppliers" params={params} />
    </div>
  )
}
