import { getTranslations } from "next-intl/server"

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatMoney } from "@/lib/format"
import { getFormat } from "@/lib/format-server"
import { getFeeStats } from "@/lib/data/fees"
import { periodDate } from "@/lib/fees"

function StatsGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">{children}</div>
}

export async function FeesStats() {
  const [t, format, stats] = await Promise.all([
    getTranslations("Fees.stats"),
    getFormat(),
    getFeeStats(),
  ])

  const money = (centavos: number) =>
    formatMoney(format, centavos)

  const cards = [
    {
      label: t("monthlyBudget"),
      value:
        stats.monthlyBudget === null ? t("notSet") : money(stats.monthlyBudget),
      detail: stats.dueDay === null ? null : t("dueDay", { day: stats.dueDay }),
    },
    {
      label: t("lastPeriod"),
      value:
        stats.lastPeriod === null
          ? t("none")
          : format.dateTime(periodDate(stats.lastPeriod), {
              month: "long",
              year: "numeric",
              timeZone: "UTC",
            }),
      detail:
        stats.lastPeriod === null
          ? null
          : t("charged", { amount: money(stats.lastPeriodTotal) }),
    },
    {
      label: t("pendingAssessments"),
      value: format.number(stats.pendingAssessments),
      detail:
        stats.pendingAssessments === 0
          ? null
          : t("outstanding", { amount: money(stats.pendingAssessmentsAmount) }),
    },
  ]

  return (
    <StatsGrid>
      {cards.map((card) => (
        <Card key={card.label}>
          <CardHeader>
            <CardDescription>{card.label}</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">
              {card.value}
            </CardTitle>
            {card.detail && (
              <p className="text-sm text-muted-foreground">{card.detail}</p>
            )}
          </CardHeader>
        </Card>
      ))}
    </StatsGrid>
  )
}

export function FeesStatsSkeleton() {
  return (
    <StatsGrid>
      {Array.from({ length: 3 }, (_, index) => (
        <Card key={index}>
          <CardHeader>
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-8 w-24" />
          </CardHeader>
        </Card>
      ))}
    </StatsGrid>
  )
}
