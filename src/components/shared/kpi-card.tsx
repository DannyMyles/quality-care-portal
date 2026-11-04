import type { AppIcon } from "@/components/icons"
import type { ReactNode } from "react"
import { ArrowDownRight, ArrowUpRight } from "@/components/icons"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const ICON_TINTS = {
  blue: "bg-[#2E3094]/10 text-[#2E3094]",
  amber: "bg-[#F5C400]/20 text-[#8A6A00]",
  emerald: "bg-[#0AC6A2]/15 text-[#068A70]",
  red: "bg-[#EB2239]/10 text-[#EB2239]",
  cyan: "bg-[#00A3E0]/12 text-[#0078A8]",
} as const

interface KpiCardProps {
  label: string
  value: ReactNode
  icon?: AppIcon
  iconTint?: keyof typeof ICON_TINTS
  trend?: { value: string; direction: "up" | "down"; positiveIsGood?: boolean }
  helperText?: string
  className?: string
}

export function KpiCard({
  label,
  value,
  icon: Icon,
  iconTint = "blue",
  trend,
  helperText,
  className,
}: KpiCardProps) {
  const trendIsGood = trend
    ? trend.direction === "up" === (trend.positiveIsGood ?? true)
    : null

  return (
    <Card className={cn("transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#2E3094]/10", className)}>
      <CardContent className="flex items-center gap-4">
        {Icon && (
          <div className={cn("flex size-11 shrink-0 items-center justify-center rounded-full", ICON_TINTS[iconTint])}>
            <Icon className="size-5" />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-[13px] leading-snug text-muted-foreground">{label}</p>
          <div className="text-[22px] font-semibold leading-tight tracking-tight">{value}</div>
          {trend && (
            <p
              className={cn(
                "mt-1 flex items-center gap-1 text-xs",
                trendIsGood ? "text-[#068A70]" : "text-[#EB2239]"
              )}
            >
              {trend.direction === "up" ? (
                <ArrowUpRight className="size-3.5" />
              ) : (
                <ArrowDownRight className="size-3.5" />
              )}
              {trend.value}
            </p>
          )}
          {helperText && (
            <p className="mt-1 text-xs text-muted-foreground">{helperText}</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
