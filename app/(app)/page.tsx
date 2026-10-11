import { Suspense } from "react"
import { getTranslations } from "next-intl/server"

import { StatsCards, StatsCardsSkeleton } from "@/components/stats-cards"
import { TableSkeleton } from "@/components/table-skeleton"
import { UnitBalanceCards } from "@/components/unit-balance-cards"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getLedgerMonth } from "@/lib/data/ledger"
import { getMyUnits, getUnitBalances } from "@/lib/data/unit-accounts"
import { periodDate } from "@/lib/fees"
import { formatMoney } from "@/lib/format"
import { getFormat } from "@/lib/format-server"

export default function DashboardPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
      <Suspense fallback={null}>
        <MyUnits />
      </Suspense>
      <Suspense fallback={<StatsCardsSkeleton />}>
        <MonthSummary />
      </Suspense>
      <Suspense fallback={<TableSkeleton />}>
        <UnitsInDebt />
      </Suspense>
    </div>
  )
}

// An owner's own units come first; nothing is shown to someone without units.
async function MyUnits() {
  const [t, units] = await Promise.all([
    getTranslations("Dashboard"),
    getMyUnits(),
  ])
  if (units.length === 0) return null

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-semibold">{t("myUnits")}</h2>
      <UnitBalanceCards units={units} />
    </section>
  )
}

// The current month's income, expenses and result, and each account's balance.
async function MonthSummary() {
  const [t, format, ledger] = await Promise.all([
    getTranslations("Dashboard"),
    getFormat(),
    getLedgerMonth(),
  ])

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-semibold capitalize">
        {format.dateTime(periodDate(ledger.period), {
          month: "long",
          year: "numeric",
          timeZone: "UTC",
        })}
      </h2>
      <StatsCards
        cards={[
          { label: t("income"), value: formatMoney(format, ledger.income) },
          { label: t("expenses"), value: formatMoney(format, ledger.expenses) },
          {
            label: t("result"),
            value: formatMoney(format, ledger.income - ledger.expenses),
          },
        ]}
      />
      <div className="grid gap-4 sm:grid-cols-3">
        {ledger.accounts
          .filter((account) => account.active)
          .map((account) => (
            <div
              key={account.id}
              className="flex items-center justify-between rounded-lg border px-4 py-3 text-sm"
            >
              <span className="text-muted-foreground">
                {t("balanceOf", { account: account.name })}
              </span>
              <span className="font-medium tabular-nums">
                {formatMoney(format, account.balance)}
              </span>
            </div>
          ))}
      </div>
    </section>
  )
}

// Every unit with an overdue amount, split in regular fees and special
// assessments, largest debt first.
async function UnitsInDebt() {
  const [t, format, balances] = await Promise.all([
    getTranslations("Dashboard"),
    getFormat(),
    getUnitBalances(),
  ])
  const overdue = (unit: (typeof balances)[number]) =>
    unit.regular.overdue + unit.special.overdue
  const units = balances
    .filter((unit) => overdue(unit) > 0)
    .sort((a, b) => overdue(b) - overdue(a))

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-semibold">{t("unitsInDebt")}</h2>
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead>{t("columns.unit")}</TableHead>
              <TableHead>{t("columns.owners")}</TableHead>
              <TableHead className="text-right">
                {t("columns.regular")}
              </TableHead>
              <TableHead className="text-right">
                {t("columns.special")}
              </TableHead>
              <TableHead className="text-right">{t("columns.total")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {units.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  {t("noDebt")}
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
                  <TableCell className="text-right tabular-nums">
                    {formatMoney(format, unit.regular.overdue)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMoney(format, unit.special.overdue)}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatMoney(format, overdue(unit))}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  )
}
