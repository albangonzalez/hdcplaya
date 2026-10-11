import { Suspense } from "react"
import { getTranslations } from "next-intl/server"

import { StatsCards, StatsCardsSkeleton } from "@/components/stats-cards"
import { TableSkeleton } from "@/components/table-skeleton"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getAccounts } from "@/lib/data/ledger"
import { formatMoney } from "@/lib/format"
import { getFormat } from "@/lib/format-server"
import { AccountRowActions, AddAccountButton } from "./account-dialog"

export default function AccountsPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
      <Suspense
        fallback={
          <>
            <StatsCardsSkeleton />
            <TableSkeleton rows={3} />
          </>
        }
      >
        <Accounts />
      </Suspense>
    </div>
  )
}

// Every signed-in user sees the accounts and their balances; the admin can
// also add and edit them.
async function Accounts() {
  const [t, format, { accounts, canManage }] = await Promise.all([
    getTranslations("Accounts"),
    getFormat(),
    getAccounts(),
  ])

  const total = (type?: "bank" | "cash") =>
    accounts
      .filter((account) => account.active && (!type || account.type === type))
      .reduce((sum, account) => sum + account.balance, 0)

  return (
    <>
      <StatsCards
        cards={[
          { label: t("stats.total"), value: formatMoney(format, total()) },
          { label: t("stats.bank"), value: formatMoney(format, total("bank")) },
          { label: t("stats.cash"), value: formatMoney(format, total("cash")) },
        ]}
      />
      {canManage && (
        <div className="flex justify-end">
          <AddAccountButton />
        </div>
      )}
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead>{t("columns.name")}</TableHead>
              <TableHead>{t("columns.type")}</TableHead>
              <TableHead>{t("columns.opening")}</TableHead>
              <TableHead className="text-right">
                {t("columns.balance")}
              </TableHead>
              {canManage && (
                <TableHead className="w-12">
                  <span className="sr-only">{t("columns.actions")}</span>
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  {t("empty")}
                </TableCell>
              </TableRow>
            ) : (
              accounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell className="font-medium">{account.name}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Badge variant="outline">
                        {t(`types.${account.type}`)}
                      </Badge>
                      {!account.active && (
                        <Badge
                          variant="outline"
                          className="text-muted-foreground"
                        >
                          {t("inactive")}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground tabular-nums">
                    {t("opening", {
                      amount: formatMoney(format, account.openingBalance),
                      date: format.dateTime(new Date(account.openingDate), {
                        dateStyle: "medium",
                        timeZone: "UTC",
                      }),
                    })}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatMoney(format, account.balance)}
                  </TableCell>
                  {canManage && (
                    <TableCell>
                      <AccountRowActions account={account} />
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </>
  )
}
