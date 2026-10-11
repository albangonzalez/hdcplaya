import { Suspense } from "react"
import Link from "next/link"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { getLocale, getTranslations } from "next-intl/server"

import { StatsCards, StatsCardsSkeleton } from "@/components/stats-cards"
import { TableSkeleton } from "@/components/table-skeleton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getLedgerMonth, getLedgerOptions } from "@/lib/data/ledger"
import { periodDate } from "@/lib/fees"
import { formatMoney } from "@/lib/format"
import { getFormat } from "@/lib/format-server"
import {
  AddTransactionButton,
  TransactionRowActions,
} from "./transaction-controls"

export default function TransactionsPage({
  searchParams,
}: PageProps<"/transactions">) {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
      <Suspense
        fallback={
          <>
            <StatsCardsSkeleton />
            <TableSkeleton />
          </>
        }
      >
        <Ledger searchParams={searchParams} />
      </Suspense>
    </div>
  )
}

// One month of the ledger, chosen with ?month=YYYY-MM. Every signed-in user
// sees it; the admin can also add, edit and cancel transactions.
async function Ledger({
  searchParams,
}: Pick<PageProps<"/transactions">, "searchParams">) {
  const { month } = await searchParams
  const [t, format, locale, ledger, options] = await Promise.all([
    getTranslations("Transactions"),
    getFormat(),
    getLocale(),
    getLedgerMonth(typeof month === "string" ? month : undefined),
    getLedgerOptions(),
  ])

  const monthName = (period: string) =>
    format.dateTime(periodDate(period), {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    })

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            aria-label={t("previousMonth")}
            render={<Link href={`/transactions?month=${ledger.previousPeriod}`} />}
          >
            <ChevronLeftIcon />
          </Button>
          <h2 className="min-w-40 text-center font-semibold capitalize">
            {monthName(ledger.period)}
          </h2>
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            aria-label={t("nextMonth")}
            disabled={!ledger.nextPeriod}
            render={
              ledger.nextPeriod ? (
                <Link href={`/transactions?month=${ledger.nextPeriod}`} />
              ) : undefined
            }
          >
            <ChevronRightIcon />
          </Button>
        </div>
        {ledger.canManage && <AddTransactionButton options={options} />}
      </div>
      <StatsCards
        cards={[
          { label: t("stats.income"), value: formatMoney(format, ledger.income) },
          {
            label: t("stats.expenses"),
            value: formatMoney(format, ledger.expenses),
          },
          {
            label: t("stats.result"),
            value: formatMoney(format, ledger.income - ledger.expenses),
          },
        ]}
      />
      <div className="grid gap-4 sm:grid-cols-3">
        {ledger.accounts.map((account) => (
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
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead>{t("columns.date")}</TableHead>
              <TableHead>{t("columns.description")}</TableHead>
              <TableHead>{t("columns.category")}</TableHead>
              <TableHead>{t("columns.account")}</TableHead>
              <TableHead className="text-right">{t("columns.amount")}</TableHead>
              {ledger.canManage && (
                <TableHead className="w-12">
                  <span className="sr-only">{t("columns.actions")}</span>
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {ledger.transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  {t("empty")}
                </TableCell>
              </TableRow>
            ) : (
              ledger.transactions.map((transaction) => {
                const cancelled = transaction.status === "cancelled"
                const amount = formatMoney(format, transaction.amount)
                const date = format.dateTime(new Date(transaction.date), {
                  dateStyle: "medium",
                  timeZone: "UTC",
                })
                return (
                  <TableRow key={transaction.id}>
                    <TableCell>{date}</TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {transaction.description}
                        {cancelled && (
                          <Badge
                            variant="outline"
                            title={transaction.cancelReason ?? undefined}
                          >
                            {t("cancelled")}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {transaction.type === "transfer"
                        ? t("types.transfer")
                        : (transaction.category?.[locale] ?? "")}
                    </TableCell>
                    <TableCell>
                      {transaction.toAccount
                        ? `${transaction.account} → ${transaction.toAccount}`
                        : transaction.account}
                    </TableCell>
                    <TableCell
                      className={
                        cancelled
                          ? "text-right text-muted-foreground tabular-nums line-through"
                          : transaction.type === "transfer"
                            ? "text-right text-muted-foreground tabular-nums"
                            : "text-right tabular-nums"
                      }
                    >
                      {transaction.type === "expense" ? `−${amount}` : amount}
                    </TableCell>
                    {ledger.canManage && (
                      <TableCell>
                        <TransactionRowActions
                          transaction={transaction}
                          options={options}
                          summary={t("cancel.summary", {
                            description: transaction.description,
                            amount,
                            date,
                          })}
                        />
                      </TableCell>
                    )}
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </>
  )
}
