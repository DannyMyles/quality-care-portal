import { LedgerView } from "@/components/shared/ledger-view"

export default async function ExpensesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  return <LedgerView rootType="Expense" title="Expenses" description="Everything spent, by account, with the postings behind it." path="/books/expenses" colour="#00A3E0" params={await searchParams} />
}
