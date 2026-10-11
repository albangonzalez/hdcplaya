"use server"

import { refresh } from "next/cache"
import { ObjectId } from "mongodb"

import { recordAudit } from "@/lib/audit"
import { requireAdmin } from "@/lib/auth"
import { condoToday } from "@/lib/condo-time"
import { isMonthLocked } from "@/lib/payments"
import { accountsCollection } from "@/models/account"
import { categoriesCollection } from "@/models/category"
import { objectIdStringSchema } from "@/models/shared"
import {
  cancelTransactionInputSchema,
  transactionInputSchema,
  transactionSchema,
  transactionsCollection,
} from "@/models/transaction"

export type SaveTransactionResult =
  | { ok: true }
  | {
      ok: false
      error:
        | "invalid"
        | "notFound"
        | "fromPayment"
        | "futureDate"
        | "monthLocked"
        | "accountNotFound"
        | "categoryNotFound"
        | "saveFailed"
    }

export type CancelTransactionResult =
  | { ok: true }
  | {
      ok: false
      error:
        | "invalid"
        | "notFound"
        | "fromPayment"
        | "monthLocked"
        | "saveFailed"
    }

const calendarDate = (date: Date) => date.toISOString().slice(0, 10)

// Adds a transaction to the ledger (no id) or saves changes to one. A month
// can be changed until 7 days after it ends; a transaction created by a
// payment is corrected by cancelling that payment.
export async function saveTransaction(
  id: unknown,
  input: unknown
): Promise<SaveTransactionResult> {
  const admin = await requireAdmin()

  const parsedId = objectIdStringSchema.nullable().safeParse(id)
  const parsed = transactionInputSchema.safeParse(input)
  if (!parsedId.success || !parsed.success) {
    return { ok: false, error: "invalid" }
  }
  const data = parsed.data

  const transactions = transactionsCollection()
  const existing = parsedId.data
    ? await transactions.findOne({ _id: new ObjectId(parsedId.data) })
    : null
  if (parsedId.data && (!existing || existing.status !== "active")) {
    return { ok: false, error: "notFound" }
  }
  if (existing?.paymentId) {
    return { ok: false, error: "fromPayment" }
  }
  // A saved transaction keeps its type.
  if (existing && existing.type !== data.type) {
    return { ok: false, error: "invalid" }
  }

  const today = condoToday()
  if (data.date > today) {
    return { ok: false, error: "futureDate" }
  }
  if (
    isMonthLocked(data.date, today) ||
    (existing && isMonthLocked(calendarDate(existing.date), today))
  ) {
    return { ok: false, error: "monthLocked" }
  }

  const accountIds = [data.accountId, data.toAccountId]
    .filter((accountId) => accountId !== null)
    .map((accountId) => new ObjectId(accountId))
  const activeAccounts = await accountsCollection().countDocuments({
    _id: { $in: accountIds },
    active: true,
  })
  if (activeAccounts !== accountIds.length) {
    return { ok: false, error: "accountNotFound" }
  }
  if (data.categoryId) {
    const category = await categoriesCollection().findOne({
      _id: new ObjectId(data.categoryId),
      kind: data.type === "income" ? "income" : "expense",
      active: true,
    })
    if (!category) {
      return { ok: false, error: "categoryNotFound" }
    }
  }

  try {
    const now = new Date()
    const transaction = transactionSchema.parse({
      _id: existing?._id ?? new ObjectId(),
      type: data.type,
      date: new Date(`${data.date}T00:00:00Z`),
      amount: data.amount,
      description: data.description,
      accountId: new ObjectId(data.accountId),
      toAccountId: data.toAccountId ? new ObjectId(data.toAccountId) : null,
      categoryId: data.categoryId ? new ObjectId(data.categoryId) : null,
      paymentId: null,
      status: "active",
      cancelReason: null,
      createdBy: existing?.createdBy ?? admin._id,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    })
    await transactions.replaceOne({ _id: transaction._id }, transaction, {
      upsert: true,
    })
    await recordAudit({
      actorId: admin._id,
      action: existing ? "update" : "create",
      collection: "transactions",
      documentId: transaction._id,
      before: existing,
      after: transaction,
    })
  } catch (saveError) {
    console.error("Saving the transaction failed", saveError)
    return { ok: false, error: "saveFailed" }
  }

  refresh()
  return { ok: true }
}

// Cancels a transaction with a reason. It stays in the ledger, struck out,
// and no longer counts in totals or balances.
export async function cancelTransaction(
  input: unknown
): Promise<CancelTransactionResult> {
  const admin = await requireAdmin()

  const parsed = cancelTransactionInputSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: "invalid" }
  }

  const transactions = transactionsCollection()
  const transaction = await transactions.findOne({
    _id: new ObjectId(parsed.data.transactionId),
    status: "active",
  })
  if (!transaction) {
    return { ok: false, error: "notFound" }
  }
  if (transaction.paymentId) {
    return { ok: false, error: "fromPayment" }
  }
  if (isMonthLocked(calendarDate(transaction.date), condoToday())) {
    return { ok: false, error: "monthLocked" }
  }

  try {
    const cancelled = transactionSchema.parse({
      ...transaction,
      status: "cancelled",
      cancelReason: parsed.data.reason,
      updatedAt: new Date(),
    })
    await transactions.replaceOne({ _id: transaction._id }, cancelled)
    await recordAudit({
      actorId: admin._id,
      action: "cancel",
      collection: "transactions",
      documentId: transaction._id,
      before: transaction,
      after: cancelled,
    })
  } catch (saveError) {
    console.error("Cancelling the transaction failed", saveError)
    return { ok: false, error: "saveFailed" }
  }

  refresh()
  return { ok: true }
}
