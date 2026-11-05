import { Building2 } from "@/components/icons"
import { FormDialog, type FormField } from "@/components/forms/form-dialog"
import { DeskLink } from "@/components/shared/desk-link"
import { FilterBar, SearchFilter } from "@/components/shared/filters"
import { PageHeader } from "@/components/shared/page-header"
import { RecordTable, type Column } from "@/components/shared/record-table"
import { createSupplier, updateSupplier } from "@/lib/actions"
import { api, getMe } from "@/lib/frappe/client"
import { formatKes, pageOf } from "@/lib/format"
import type { Page } from "@/lib/frappe/types"

interface Supplier {
  name: string
  supplier_name: string
  supplier_group?: string
  supplier_type?: string
  tax_id?: string
  tax_withholding_category?: string
  balance?: number
}

const TRAINERS = "Trainers"
const TRAINER_WHT = "WHT 5% Professional Fees"
const NO_WITHHOLDING = "None"

function supplierFields(options: { groups: string[]; withholding: string[] }, row?: Supplier): FormField[] {
  const choices = (values: string[]) => values.map((value) => ({ value, label: value }))
  return [
    { name: "supplier_name", label: "Name", required: true, full: true, initial: row?.supplier_name },
    {
      name: "supplier_group",
      label: "Group",
      type: "select",
      required: true,
      initial: row?.supplier_group,
      options: choices(options.groups),
      presets: options.withholding.includes(TRAINER_WHT) ? { [TRAINERS]: { field: "tax_withholding_category", value: TRAINER_WHT } } : undefined,
    },
    { name: "supplier_type", label: "Type", type: "select", required: true, initial: row?.supplier_type ?? "Individual", options: [{ value: "Individual", label: "Individual" }, { value: "Company", label: "Company" }] },
    { name: "tax_id", label: "KRA PIN", initial: row?.tax_id, placeholder: "A012345678Z" },
    { name: "tax_withholding_category", label: "Withholding tax", type: "select", initial: row?.tax_withholding_category ?? NO_WITHHOLDING, options: [{ value: NO_WITHHOLDING, label: NO_WITHHOLDING }, ...choices(options.withholding)] },
  ]
}

export default async function SuppliersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams
  const { page, start, limit } = pageOf(params)
  const me = await getMe()
  const data = await api<Page<Supplier> & { options: { groups: string[]; withholding: string[] } }>("suppliers", { params: { search: params.search, start, limit } })
  const columns: Column<Supplier>[] = [
    { header: "Supplier", cell: (row) => <span className="font-medium">{row.supplier_name}</span> },
    { header: "Group", cell: (row) => row.supplier_group ?? "—", wide: true },
    { header: "KRA PIN", cell: (row) => row.tax_id ?? "—" },
    { header: "Withholding tax", cell: (row) => row.tax_withholding_category ?? "None", wide: true },
    ...(me.can.finance ? [{ header: "We owe", align: "right" as const, cell: (row: Supplier) => formatKes(row.balance) }] : []),
    { header: "Desk", wide: true, cell: (row) => <DeskLink doctype="Supplier" name={row.name} label="Open" /> },
    ...(me.can.edit_suppliers
      ? [{
          header: "",
          // Keyed on the values so that the form reopens showing what was just saved.
          cell: (row: Supplier) => <FormDialog key={JSON.stringify(row)} title={`Edit ${row.supplier_name}`} triggerLabel="Edit" trigger="edit" success="Supplier saved" fields={supplierFields(data.options, row)} action={updateSupplier.bind(null, row.name)} />,
        }]
      : []),
  ]
  const add = me.can.add_suppliers ? <FormDialog title="New supplier" triggerLabel="New supplier" trigger="add" success="Supplier saved" fields={supplierFields(data.options)} action={createSupplier} /> : null
  return (
    <div>
      <PageHeader title="Suppliers" description="Trainers and everyone else Quality Care pays." actions={add} />
      <FilterBar>
        <SearchFilter placeholder="Search by name, PIN or group" />
      </FilterBar>
      <RecordTable columns={columns} rows={data.rows} rowKey={(row) => row.name} empty="No suppliers found" emptyIcon={Building2} total={data.total} page={page} path="/suppliers" params={params} />
    </div>
  )
}
