import { LedgerView } from "@/components/shared/ledger-view"

export default async function IncomePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  return <LedgerView rootType="Income" title="Income" description="Everything earned, by account, with the postings behind it." path="/books/income" colour="#3D48C8" params={await searchParams} />
}
