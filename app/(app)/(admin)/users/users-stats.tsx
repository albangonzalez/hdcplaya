import { getTranslations } from "next-intl/server"

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { getFormat } from "@/lib/format-server"
import { getUserStats, type UserStats } from "@/lib/data/users"

const stats: (keyof UserStats)[] = [
  "activeOwners",
  "deactivatedAccounts",
  "committeeMembers",
]

function StatsGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">{children}</div>
}

export async function UsersStats() {
  const [t, format, values] = await Promise.all([
    getTranslations("Users.stats"),
    getFormat(),
    getUserStats(),
  ])

  return (
    <StatsGrid>
      {stats.map((stat) => (
        <Card key={stat}>
          <CardHeader>
            <CardDescription>{t(stat)}</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">
              {format.number(values[stat])}
            </CardTitle>
          </CardHeader>
        </Card>
      ))}
    </StatsGrid>
  )
}

export function UsersStatsSkeleton() {
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
