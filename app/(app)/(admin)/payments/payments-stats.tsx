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
import { getPaymentStats } from "@/lib/data/payments"

function StatsGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">{children}</div>
}

export async function PaymentsStats() {
  const [t, format, stats] = await Promise.all([
    getTranslations("Payments.stats"),
    getFormat(),
    getPaymentStats(),
  ])

  const money = (centavos: number) =>
    formatMoney(format, centavos)

  const cards = [
    {
      label: t("receivedThisMonth"),
      value: money(stats.receivedThisMonth),
      detail: t("payments", { count: stats.paymentsThisMonth }),
    },
    {
      label: t("regularOutstanding"),
      value: money(stats.regular.outstanding),
      detail: t("overdue", { amount: money(stats.regular.overdue) }),
    },
    {
      label: t("specialOutstanding"),
      value: money(stats.special.outstanding),
      detail: t("overdue", { amount: money(stats.special.overdue) }),
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
            <p className="text-sm text-muted-foreground">{card.detail}</p>
          </CardHeader>
        </Card>
      ))}
    </StatsGrid>
  )
}

export function PaymentsStatsSkeleton() {
  return (
    <StatsGrid>
      {Array.from({ length: 3 }, (_, index) => (
        <Card key={index}>
          <CardHeader>
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-4 w-28" />
          </CardHeader>
        </Card>
      ))}
    </StatsGrid>
  )
}
