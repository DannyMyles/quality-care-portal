import { FormDialog } from "@/components/forms/form-dialog"
import { otherCompany } from "@/components/shared/other-company"
import { FilterBar, SearchFilter } from "@/components/shared/filters"
import { PageHeader } from "@/components/shared/page-header"
import { RecordTable } from "@/components/shared/record-table"
import { StatusTabs } from "@/components/shared/status-tabs"
import { setHireRates } from "@/lib/actions"
import { api, getMe } from "@/lib/frappe/client"
import { formatKes } from "@/lib/format"

interface RateRow {
  name: string
  item_name: string
  item_group?: string
  day: number
  week: number
  owned: number
}

const shown = (value: number) => (value ? formatKes(value) : <span className="text-[#6A6C8C]">Not set</span>)

/** One price list for hiring equipment out: a rate per day and per week for each type of equipment. */
export default async function HireRatesPage({ searchParams }: { searchParams: Promise<{ search?: string; show?: string }> }) {
  const params = await searchParams
  const { search, show } = params
  const me = await getMe()
  const away = otherCompany(me, "training", "Hire rates")
  if (away) return away
  const data = await api<{ rows: RateRow[]; can_edit: boolean }>("hire_rates", { params: { search } })
  const unset = data.rows.filter((row) => !row.day && !row.week).length
  const rows = show === "unset" ? data.rows.filter((row) => !row.day && !row.week) : data.rows
  return (
    <div className="flex flex-col gap-2">
      <PageHeader
        title="Hire rates"
        description={`What each type of equipment costs to hire. Every hire uses these unless a Director approves a negotiated rate.${unset ? ` ${unset} type${unset === 1 ? " has" : "s have"} no rate yet, so ${unset === 1 ? "it" : "they"} can only go out at a negotiated rate.` : ""}`}
      />
      <StatusTabs path="/hires/rates" param="show" current={show} keep={params} options={[{ value: "", label: "All" }, { value: "unset", label: `No rate yet (${unset})` }]} />
      <FilterBar>
        <SearchFilter placeholder="Search equipment" />
      </FilterBar>
      <RecordTable
        columns={[
          { header: "Equipment", cell: (row: RateRow) => <span className="flex flex-col">{row.item_name}<span className="text-xs text-[#6A6C8C]">{row.owned} owned</span></span> },
          { header: "Per day", align: "right", cell: (row: RateRow) => shown(row.day) },
          { header: "Per week", align: "right", cell: (row: RateRow) => shown(row.week) },
          ...(data.can_edit
            ? [
                {
                  header: "Change",
                  cell: (row: RateRow) => (
                    <FormDialog
                      title={`Hire rates for ${row.item_name}`}
                      description={`These apply to all ${row.owned} ${row.item_name}${row.owned === 1 ? "" : "s"}. Leave a rate blank to remove it.`}
                      triggerLabel={`Change rates for ${row.item_name}`}
                      trigger="edit"
                      success="Hire rates saved"
                      fields={[
                        { name: "day", label: "Per day (KES)", type: "number", initial: row.day || "" },
                        { name: "week", label: "Per week (KES)", type: "number", initial: row.week || "" },
                      ]}
                      action={setHireRates.bind(null, row.name)}
                    />
                  ),
                },
              ]
            : []),
        ]}
        rows={rows}
        rowKey={(row) => row.name}
        empty="No equipment on the register"
      />
    </div>
  )
}
