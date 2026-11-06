import { InfoIcon, Phone } from "@/components/icons"
import { FormDialog } from "@/components/forms/form-dialog"
import { FilterBar, PeriodFilter, SearchFilter } from "@/components/shared/filters"
import { PageHeader } from "@/components/shared/page-header"
import { RecordTable, type Column } from "@/components/shared/record-table"
import { StatusBadge } from "@/components/shared/status-badge"
import { StatusTabs } from "@/components/shared/status-tabs"
import { allocateMpesa } from "@/lib/actions"
import { api, getMe } from "@/lib/frappe/client"
import { formatKes, pageOf } from "@/lib/format"
import type { MpesaPayment, Page } from "@/lib/frappe/types"
import { readPeriod } from "@/lib/period"

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams
  const { page, start, limit } = pageOf(params)
  const me = await getMe()
  const chosen = readPeriod(params)
  const data = await api<Page<MpesaPayment> & { enabled: boolean; years: string[] }>("mpesa_payments", { params: { status: params.status, search: params.search, from_date: chosen?.from, to_date: chosen?.to, start, limit } })
  const columns: Column<MpesaPayment>[] = [
    { header: "M-Pesa code", cell: (row) => <div><p className="font-medium">{row.transaction_id}</p><p className="mt-0.5 text-xs text-[#6A6C8C]">{row.payer_name}</p></div> },
    { header: "Phone", cell: (row) => row.phone ?? "—" },
    { header: "Invoice", cell: (row) => row.sales_invoice ?? row.customer ?? "—", wide: true },
    { header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
    { header: "Amount", align: "right", cell: (row) => formatKes(row.amount, true) },
    ...(me.can.apply_mpesa
      ? [
          {
            header: "Match",
            cell: (row: MpesaPayment) =>
              row.status === "Unmatched" ? (
                <FormDialog
                  title={`Match ${row.transaction_id}`}
                  description={`${formatKes(row.amount, true)} from ${row.payer_name ?? "the customer"}. Choose the invoice. Anything above its balance stays as an advance.`}
                  triggerLabel="Match"
                  submitLabel="Apply payment"
                  success="Payment applied"
                  showPlus={false}
                  size="sm"
                  fields={[{ name: "sales_invoice", label: "Invoice", type: "lookup", lookup: "invoice", required: true, full: true }]}
                  action={allocateMpesa.bind(null, row.name)}
                />
              ) : null,
          },
        ]
      : []),
  ]
  return (
    <div>
      <PageHeader title="M-Pesa" description="Prompts sent from an invoice post by themselves. Anyone paying the till directly gives no invoice number, so those payments wait here to be matched." />
      {!data.enabled && (
        <p className="mb-4 flex items-start gap-2.5 rounded-xl bg-[#00A3E0]/10 px-4 py-3 text-sm">
          <InfoIcon className="mt-0.5 size-4 shrink-0 text-[#0078A8]" />
          M-Pesa isn&apos;t connected yet. It starts once Quality Care&apos;s own Kopo Kopo details are entered.
        </p>
      )}
      <StatusTabs path="/payments" current={params.status} keep={params} options={["", "Unmatched", "Applied", "Reversed"].map((value) => ({ value, label: value || "All" }))} />
      <FilterBar>
        <SearchFilter placeholder="Search by code, name or account" />
        <PeriodFilter years={data.years} defaultLabel="Any date" />
      </FilterBar>
      <RecordTable columns={columns} rows={data.rows} rowKey={(row) => row.name} empty="No M-Pesa payments here" emptyIcon={Phone} total={data.total} page={page} path="/payments" params={params} />
    </div>
  )
}
