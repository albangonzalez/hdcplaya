import { Suspense } from "react"
import { getTranslations } from "next-intl/server"

import { BalanceCards } from "@/components/balance-cards"
import { StatsCardsSkeleton } from "@/components/stats-cards"
import { TableSkeleton } from "@/components/table-skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getUnitBalances, type Owed } from "@/lib/data/unit-accounts"
import { formatMoney } from "@/lib/format"
import { getFormat } from "@/lib/format-server"

export default function UnitBalancesPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
      <Suspense
        fallback={
          <>
            <StatsCardsSkeleton />
            <TableSkeleton rows={8} />
          </>
        }
      >
        <UnitBalances />
      </Suspense>
    </div>
  )
}

// Transparency rule: every owner sees what every unit owes and how much of it
// is overdue.
async function UnitBalances() {
  const [t, tBalances, format, units] = await Promise.all([
    getTranslations("UnitBalances"),
    getTranslations("Balances"),
    getFormat(),
    getUnitBalances(),
  ])

  const total = (kind: "regular" | "special"): Owed => ({
    outstanding: units.reduce((sum, unit) => sum + unit[kind].outstanding, 0),
    overdue: units.reduce((sum, unit) => sum + unit[kind].overdue, 0),
  })
  const owed = ({ outstanding, overdue }: Owed) => (
    <div className="flex flex-col items-end">
      <span className="tabular-nums">{formatMoney(format, outstanding)}</span>
      {overdue > 0 && (
        <span className="text-xs text-destructive tabular-nums">
          {tBalances("overdue", { amount: formatMoney(format, overdue) })}
        </span>
      )}
    </div>
  )

  return (
    <>
      <BalanceCards
        regular={total("regular")}
        special={total("special")}
        credit={units.reduce((sum, unit) => sum + unit.credit, 0)}
      />
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead>{t("columns.unit")}</TableHead>
              <TableHead>{t("columns.owners")}</TableHead>
              <TableHead className="text-right">
                {tBalances("regular")}
              </TableHead>
              <TableHead className="text-right">
                {tBalances("special")}
              </TableHead>
              <TableHead className="text-right">{tBalances("credit")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {units.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  {t("empty")}
                </TableCell>
              </TableRow>
            ) : (
              units.map((unit) => (
                <TableRow key={unit.id}>
                  <TableCell className="font-medium">
                    {unit.identifier}
                  </TableCell>
                  <TableCell>
                    {unit.owners.length > 0 ? (
                      unit.owners.join(", ")
                    ) : (
                      <span className="text-muted-foreground">
                        {t("noOwner")}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{owed(unit.regular)}</TableCell>
                  <TableCell>{owed(unit.special)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {unit.credit > 0 ? formatMoney(format, unit.credit) : "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </>
  )
}
