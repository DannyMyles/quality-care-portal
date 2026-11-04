import { BooksTabs } from "@/components/shared/books-tabs"
import { getMe } from "@/lib/frappe/client"

export default async function BooksLayout({ children }: { children: React.ReactNode }) {
  const me = await getMe()
  return (
    <div>
      <BooksTabs can={me.can} />
      {children}
    </div>
  )
}
