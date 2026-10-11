import { getTranslations } from "next-intl/server"

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { getFormat } from "@/lib/format-server"
import { getUnitStats, type UnitStats } from "@/lib/data/units"
import { OWNERSHIP_SHARE_TOTAL } from "@/models/unit"

const stats: (keyof UnitStats)[] = ["units", "withoutOwner", "ownershipShare"]

function StatsGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">{children}</div>
}

export async function UnitsStats() {
  const [t, format, values] = await Promise.all([
    getTranslations("Units.stats"),
    getFormat(),
    getUnitStats(),
  ])

  const sharesAddUp =
    values.units === 0 || values.ownershipShare === OWNERSHIP_SHARE_TOTAL

  return (
    <StatsGrid>
      {stats.map((stat) => (
        <Card key={stat}>
          <CardHeader>
            <CardDescription>{t(stat)}</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">
              {format.number(values[stat])}
              {stat === "ownershipShare" && (
                <span className="text-muted-foreground">
                  {" / "}
                  {format.number(OWNERSHIP_SHARE_TOTAL)}
                </span>
              )}
            </CardTitle>
            {stat === "ownershipShare" && !sharesAddUp && (
              <p className="text-sm text-destructive">{t("shareWarning", { total: OWNERSHIP_SHARE_TOTAL })}</p>
            )}
          </CardHeader>
        </Card>
      ))}
    </StatsGrid>
  )
}

export function UnitsStatsSkeleton() {
  return (
    <StatsGrid>
      {stats.map((stat) => (
        <Card key={stat}>
          <CardHeader>
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-8 w-12" />
          </CardHeader>
        </Card>
      ))}
    </StatsGrid>
  )
}
