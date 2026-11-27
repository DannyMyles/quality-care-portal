import { GraduationCap } from "@/components/icons"
import { FormDialog, type FormField } from "@/components/forms/form-dialog"
import { FilterBar, SearchFilter, SelectFilter } from "@/components/shared/filters"
import { PageHeader } from "@/components/shared/page-header"
import { RecordTable } from "@/components/shared/record-table"
import { saveItem, setItemActive, type FormValues } from "@/lib/actions"
import { ActionButton } from "@/components/forms/action-button"
import { DeleteButton } from "@/components/forms/delete-button"
import { StatusTabs } from "@/components/shared/status-tabs"
import { isQualityCare, navLabel, shortCompany } from "@/lib/company"
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
  description?: string
  qc_cpd_points?: number
  income_account?: string
  cost_center?: string
  disabled?: number
}

interface ItemOptions {
  groups: string[]
  income_accounts: { name: string; account_name: string }[]
  cost_centres: string[]
  uoms: string[]
}

/** The form for a course or service, new or being changed. Income and business line are this company's. */
function itemFields(options: ItemOptions, row?: Item): FormField[] {
  return [
    { name: "item_name", label: "Name", required: true, full: true, initial: row?.item_name ?? "", placeholder: "Such as Basic Life Support, or Commercial Rent" },
    { name: "item_group", label: "Group", type: "select", required: true, initial: row?.item_group ?? "", options: choices(options.groups) },
    ...(row ? [] : [{ name: "stock_uom", label: "Charged per", type: "select" as const, initial: "Nos", options: options.uoms.map((value) => ({ value, label: value === "Nos" ? "Each (Nos)" : value })) }]),
    { name: "standard_rate", label: "Standard price (KES)", type: "number", initial: row?.standard_rate ?? "", hint: "Leave at 0 if it's priced each time." },
    { name: "qc_cpd_points", label: "CPD points", type: "number", initial: row?.qc_cpd_points ?? "", hint: "For courses only." },
    { name: "income_account", label: "Income goes to", type: "select", initial: row?.income_account ?? "", options: options.income_accounts.map((account) => ({ value: account.name, label: account.account_name })) },
    { name: "cost_center", label: "Business line", type: "select", initial: row?.cost_center ?? "", options: options.cost_centres.map((value) => ({ value, label: value.replace(/ - [A-Z]+$/, "") })) },
    { name: "description", label: "Description", type: "textarea", initial: row?.description?.replace(/<[^>]+>/g, "") ?? "" },
  ]
}


const choices = (values: string[]) => values.map((value) => ({ value, label: value }))

export default async function ServicesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams
  const { page, start, limit } = pageOf(params)
  const me = await getMe()
  const retired = params.show === "retired"
  const data = await api<Page<Item> & { groups: string[] }>("items", { params: { search: params.search, item_group: params.group, retired: retired ? 1 : 0, start, limit } })
  const options = me.can.edit_items || me.can.add_items ? await api<ItemOptions>("item_options") : null
  const add = options && me.can.add_items ? <FormDialog title="New course or service" description="Something this company sells, with where its income goes." triggerLabel="New course or service" trigger="add" success="Saved" fields={itemFields(options)} action={saveItem} /> : null
  return (
    <div>
      <PageHeader
        title={navLabel("Courses & Services", me.company)}
        description={isQualityCare(me.company) ? "What Quality Care sells, and the trainer fee it pays." : `What ${shortCompany(me.company)} sells.`}
        actions={add}
      />
      <StatusTabs path="/services" param="show" current={params.show} keep={params} options={[{ value: "", label: "In use" }, { value: "retired", label: "Retired" }]} />
      <FilterBar>
        <SearchFilter placeholder="Search by name or group" />
        <SelectFilter param="group" placeholder="All groups" options={choices(data.groups)} />
      </FilterBar>
      <RecordTable
        columns={[
          { header: "Code", cell: (row) => (row.name !== row.item_name ? <span className="font-medium">{row.name}</span> : "—") },
          { header: "Name", cell: (row) => <span className="font-medium">{row.item_name}</span> },
          { header: "Group", cell: (row) => row.item_group },
          { header: "Used for", cell: (row) => (row.is_sales_item ? "Sales" : row.is_purchase_item ? "Purchases" : "—") },
          { header: "Charged per", cell: (row) => row.stock_uom, wide: true },
          { header: "Standard price", align: "right", cell: (row) => (row.standard_rate ? formatKes(row.standard_rate) : "Set per class or job") },
          ...(me.can.edit_items && options
            ? [{
                header: "",
                cell: (row: Item) => {
                  const update = async (values: FormValues) => {
                    "use server"
                    return saveItem({ ...values, name: row.name })
                  }
                  return (
                    <span className="flex flex-wrap items-center gap-1">
                      {/* Keyed on what was saved, so the form reopens showing it. */}
                      <FormDialog key={JSON.stringify(row)} title={`Edit ${row.item_name}`} triggerLabel={`Edit ${row.item_name}`} trigger="edit" success="Saved" fields={itemFields(options, row)} action={update} />
                      <ActionButton variant="ghost" size="sm" label={row.disabled ? "Use again" : "Retire"} success={row.disabled ? "Back in use" : "Retired"} confirm={row.disabled ? undefined : `Retire ${row.item_name}? It stops being offered on new invoices; past ones keep it.`} action={setItemActive.bind(null, row.name, !!row.disabled)} />
                      {me.delete.item && <DeleteButton kind="item" name={row.name} what={row.item_name} goTo="/services" size="sm" />}
                    </span>
                  )
                },
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
