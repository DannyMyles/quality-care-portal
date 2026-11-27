import type { AppIcon } from "@/components/icons"

/**
 * An icon whose label slides out on hover or keyboard focus, as on the "+ New" buttons. Touch screens can't
 * hover, so they always show the label. Use inside a Button that has an aria-label and title.
 */
export function HoverLabel({ icon: Icon, label }: { icon: AppIcon; label: string }) {
  return (
    <>
      <Icon className="size-4" />
      <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-200 group-hover/button:ml-2 group-hover/button:max-w-52 group-hover/button:opacity-100 group-focus-visible/button:ml-2 group-focus-visible/button:max-w-52 group-focus-visible/button:opacity-100 motion-reduce:transition-none [@media(hover:none)]:ml-2 [@media(hover:none)]:max-w-52 [@media(hover:none)]:opacity-100">
        {label}
      </span>
    </>
  )
}
