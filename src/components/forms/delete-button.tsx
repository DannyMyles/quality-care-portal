"use client"

import { ActionButton } from "@/components/forms/action-button"
import { Trash } from "@/components/icons"
import { deleteRecord } from "@/lib/actions"

/** Deletes a record after asking, then goes back to its list. Frappe refuses anything still in use, and says why. */
export function DeleteButton({ kind, name, what, goTo, size }: { kind: string; name: string; what: string; goTo: string; size?: "sm" }) {
  return <ActionButton variant="outline" size={size} icon={Trash} label="Delete" success="Deleted" confirm={`Delete ${what}? This can't be undone.`} action={deleteRecord.bind(null, kind, name)} goTo={goTo} />
}
