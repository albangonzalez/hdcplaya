import type { ObjectId } from "mongodb"

import { getRole, requireUser } from "@/lib/auth"
import { condoToday } from "@/lib/condo-time"
import { nextPeriod, periodDate } from "@/lib/fees"
import { isMonthLocked } from "@/lib/payments"
import { accountsCollection, type Account } from "@/models/account"
import { categoriesCollection, type Category } from "@/models/category"
import {
  transactionsCollection,
  type Transaction,
} from "@/models/transaction"

// Plain values only, so they can be passed to Client Components. Amounts are
// centavos and dates are ISO strings.
export type AccountRow = {
  id: string
  name: string
  type: Account["type"]
  openingBalance: number
  openingDate: string
  active: boolean
  // Opening balance plus every transaction up to the moment asked for.
  balance: number
}

export type TransactionRow = {
  id: string
  date: string
  type: Transaction["type"]
  description: string
  amount: number
  accountId: string
  account: string
  // Transfers only.
  toAccountId: string | null
  toAccount: string | null
  // Null for a transfer.
  categoryId: string | null
  category: Category["name"] | null
  status: Transaction["status"]
  cancelReason: string | null
  // Created by a recorded payment: corrected from the payments page.
  fromPayment: boolean
  // The admin can still edit or cancel it: active, entered by hand and in a
  // month that is not locked.
  editable: boolean
}

export type LedgerMonth = {
  period: string
  // Null when the next month has not started yet.
  nextPeriod: string | null
  previousPeriod: string
  income: number
  expenses: number
  // Each account's balance at the end of the month.
  accounts: AccountRow[]
  transactions: TransactionRow[]
  canManage: boolean
}

export type LedgerOptions = {
  accounts: { id: string; name: string }[]
  categories: { id: string; kind: Category["kind"]; name: Category["name"] }[]
  // Today's date where the condo is, "YYYY-MM-DD".
  today: string
}

// What each account's transactions add up to, optionally only those dated
// before `before`. Cancelled transactions do not count.
async function getMovements(before?: Date): Promise<Map<string, number>> {
  const match = {
    status: "active" as const,
    ...(before ? { date: { $lt: before } } : {}),
  }
  const transactions = transactionsCollection()
  const [own, received] = await Promise.all([
    transactions
      .aggregate<{ _id: ObjectId; total: number }>([
        { $match: match },
        {
          $group: {
            _id: "$accountId",
            // Income raises the account; an expense or a transfer out lowers it.
            total: {
              $sum: {
                $cond: [
                  { $eq: ["$type", "income"] },
                  "$amount",
                  { $multiply: ["$amount", -1] },
                ],
              },
            },
          },
        },
      ])
      .toArray(),
    transactions
      .aggregate<{ _id: ObjectId; total: number }>([
        { $match: { ...match, type: "transfer" } },
        { $group: { _id: "$toAccountId", total: { $sum: "$amount" } } },
      ])
      .toArray(),
  ])

  const movements = new Map<string, number>()
  for (const { _id, total } of [...own, ...received]) {
    const id = _id.toHexString()
    movements.set(id, (movements.get(id) ?? 0) + total)
  }
  return movements
}

function toAccountRow(account: Account, movements: Map<string, number>) {
  const id = account._id.toHexString()
  return {
    id,
    name: account.name,
    type: account.type,
    openingBalance: account.openingBalance,
    openingDate: account.openingDate.toISOString(),
    active: account.active,
    balance: account.openingBalance + (movements.get(id) ?? 0),
  }
}

// Every account with its current balance. Every signed-in user can see them.
export async function getAccounts(): Promise<{
  accounts: AccountRow[]
  canManage: boolean
}> {
  const user = await requireUser()

  const [accounts, movements] = await Promise.all([
    accountsCollection().find().sort({ name: 1 }).toArray(),
    getMovements(),
  ])

  return {
    accounts: accounts.map((account) => toAccountRow(account, movements)),
    canManage: getRole(user) === "admin",
  }
}

// One month of the ledger: totals, account balances at its end and the
// transactions behind them. An unknown or future month falls back to the
// current one.
export async function getLedgerMonth(month?: string): Promise<LedgerMonth> {
  const user = await requireUser()

  const today = condoToday()
  const currentPeriod = today.slice(0, 7)
  const period =
    month && /^\d{4}-(0[1-9]|1[0-2])$/.test(month) && month <= currentPeriod
      ? month
      : currentPeriod
  const start = periodDate(period)
  const end = periodDate(nextPeriod(period))
  const canManage = getRole(user) === "admin"

  const [transactions, accounts, categories, movements] = await Promise.all([
    transactionsCollection()
      .find({ date: { $gte: start, $lt: end } })
      .sort({ date: -1, createdAt: -1 })
      .toArray(),
    accountsCollection().find().sort({ name: 1 }).toArray(),
    categoriesCollection().find().toArray(),
    getMovements(end),
  ])
  const accountNames = new Map(
    accounts.map((account) => [account._id.toHexString(), account.name])
  )
  const categoryNames = new Map(
    categories.map((category) => [category._id.toHexString(), category.name])
  )
  const total = (type: Transaction["type"]) =>
    transactions
      .filter((t) => t.type === type && t.status === "active")
      .reduce((sum, t) => sum + t.amount, 0)

  return {
    period,
    nextPeriod: period < currentPeriod ? nextPeriod(period) : null,
    previousPeriod: periodDate(period, 0).toISOString().slice(0, 7),
    income: total("income"),
    expenses: total("expense"),
    accounts: accounts
      // An account opened after this month did not exist yet.
      .filter((account) => account.openingDate < end)
      .map((account) => toAccountRow(account, movements)),
    transactions: transactions.map((transaction) => {
      const date = transaction.date.toISOString()
      const accountId = transaction.accountId.toHexString()
      const toAccountId = transaction.toAccountId?.toHexString() ?? null
      const categoryId = transaction.categoryId?.toHexString() ?? null
      return {
        id: transaction._id.toHexString(),
        date,
        type: transaction.type,
        description: transaction.description,
        amount: transaction.amount,
        accountId,
        account: accountNames.get(accountId) ?? "",
        toAccountId,
        toAccount: toAccountId ? (accountNames.get(toAccountId) ?? "") : null,
        categoryId,
        category: categoryId ? (categoryNames.get(categoryId) ?? null) : null,
        status: transaction.status,
        cancelReason: transaction.cancelReason,
        fromPayment: transaction.paymentId !== null,
        editable:
          canManage &&
          transaction.status === "active" &&
          transaction.paymentId === null &&
          !isMonthLocked(date.slice(0, 10), today),
      }
    }),
    canManage,
  }
}

// What the transaction form offers: active accounts and categories.
export async function getLedgerOptions(): Promise<LedgerOptions> {
  await requireUser()

  const [accounts, categories] = await Promise.all([
    accountsCollection().find({ active: true }).sort({ name: 1 }).toArray(),
    categoriesCollection()
      .find({ active: true })
      .sort({ "name.es": 1 })
      .collation({ locale: "es" })
      .toArray(),
  ])

  return {
    accounts: accounts.map((account) => ({
      id: account._id.toHexString(),
      name: account.name,
    })),
    categories: categories.map((category) => ({
      id: category._id.toHexString(),
      kind: category.kind,
      name: category.name,
    })),
    today: condoToday(),
  }
}
