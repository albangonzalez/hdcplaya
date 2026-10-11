import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export type StatCard = {
  label: string
  value: string
  detail?: string | null
  // Shown in red under the value, for something that needs attention.
  warning?: string | null
}

function StatsGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">{children}</div>
}

// The row of figures at the top of a page.
export function StatsCards({ cards }: { cards: StatCard[] }) {
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
            {card.warning && (
              <p className="text-sm text-destructive">{card.warning}</p>
            )}
          </CardHeader>
        </Card>
      ))}
    </StatsGrid>
  )
}

export function StatsCardsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <StatsGrid>
      {Array.from({ length: count }, (_, index) => (
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
