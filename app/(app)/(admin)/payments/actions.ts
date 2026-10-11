"use server"

import { refresh } from "next/cache"
import { ObjectId, type ClientSession } from "mongodb"

import { condoToday } from "@/lib/condo-time"
import { recordAudit } from "@/lib/audit"
import { requireAdmin } from "@/lib/auth"
import { withTransaction } from "@/lib/mongodb"
import { applyUnitCredit } from "@/lib/payment-allocation"
import { chargeStatus, isMonthLocked } from "@/lib/payments"
import { accountsCollection } from "@/models/account"
import { categoriesCollection, categorySchema } from "@/models/category"
import { chargeSchema, chargesCollection } from "@/models/charge"
import {
  cancelPaymentInputSchema,
  paymentInputSchema,
  paymentSchema,
  paymentsCollection,
} from "@/models/payment"
import {
  transactionSchema,
  transactionsCollection,
} from "@/models/transaction"
import { unitsCollection } from "@/models/unit"

export type RecordPaymentResult =
  | { ok: true }
  | {
      ok: false
      error:
        | "invalid"
        | "futureDate"
        | "monthLocked"
        | "unitNotFound"
        | "accountNotFound"
        | "saveFailed"
    }

export type CancelPaymentResult =
  | { ok: true }
  | {
      ok: false
      error: "invalid" | "notFound" | "monthLocked" | "saveFailed"
    }

// The income category of the transactions payments create. It is made the
// first time it is needed.
async function getFeesCategoryId(session?: ClientSession): Promise<ObjectId> {
  const categories = categoriesCollection()
  const { _id, system, ...category } = categorySchema.parse({
    _id: new ObjectId(),
    kind: "income",
    name: { es: "Cuotas", en: "Fees" },
    active: true,
    system: "fees",
  })
  const found = await categories.findOneAndUpdate(
    { system },
    { $setOnInsert: { _id, ...category } },
    { upsert: true, returnDocument: "after", session }
  )
  return found!._id
}

// Records a payment a unit made outside the app. It is applied to the unit's
// oldest unpaid charges, anything left over stays as credit, and the matching
// income transaction is created with it.
export async function recordPayment(
  input: unknown
): Promise<RecordPaymentResult> {
  const admin = await requireAdmin()

  const parsed = paymentInputSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: "invalid" }
  }

  const today = condoToday()
  if (parsed.data.date > today) {
    return { ok: false, error: "futureDate" }
  }
  if (isMonthLocked(parsed.data.date, today)) {
    return { ok: false, error: "monthLocked" }
  }

  const unitId = new ObjectId(parsed.data.unitId)
  const accountId = new ObjectId(parsed.data.accountId)
  const [unit, account] = await Promise.all([
    unitsCollection().findOne({ _id: unitId }),
    accountsCollection().findOne({ _id: accountId, active: true }),
  ])
  if (!unit) {
    return { ok: false, error: "unitNotFound" }
  }
  if (!account) {
    return { ok: false, error: "accountNotFound" }
  }

  try {
    await withTransaction(async (session) => {
      const now = new Date()
      const date = new Date(`${parsed.data.date}T00:00:00Z`)
      const paymentId = new ObjectId()
      const transactionId = new ObjectId()

      const transaction = transactionSchema.parse({
        _id: transactionId,
        type: "income",
        date,
        amount: parsed.data.amount,
        description: `Pago de cuotas · ${unit.identifier}`,
        accountId,
        toAccountId: null,
        categoryId: await getFeesCategoryId(session),
        paymentId,
        status: "active",
        cancelReason: null,
        createdBy: admin._id,
        createdAt: now,
        updatedAt: now,
      })
      await transactionsCollection().insertOne(transaction, { session })
      // Saved unapplied; applying the unit's credit is what pays its charges.
      const payment = paymentSchema.parse({
        _id: paymentId,
        unitId,
        date,
        amount: parsed.data.amount,
        method: parsed.data.method,
        accountId,
        allocations: [],
        unallocatedAmount: parsed.data.amount,
        transactionId,
        status: "active",
        cancelReason: null,
        recordedBy: admin._id,
        createdAt: now,
      })
      await paymentsCollection().insertOne(payment, { session })
      await recordAudit(
        [
          {
            actorId: admin._id,
            action: "create",
            collection: "payments",
            documentId: paymentId,
            after: payment,
          },
          {
            actorId: admin._id,
            action: "create",
            collection: "transactions",
            documentId: transactionId,
            after: transaction,
          },
        ],
        session
      )
      await applyUnitCredit(unitId, session)
    })
  } catch (saveError) {
    console.error("Recording the payment failed", saveError)
    refresh()
    return { ok: false, error: "saveFailed" }
  }

  refresh()
  return { ok: true }
}

// Cancels a payment with a reason: the charges it paid owe that amount again
// and its income transaction is cancelled too. Nothing is deleted.
export async function cancelPayment(
  input: unknown
): Promise<CancelPaymentResult> {
  const admin = await requireAdmin()

  const parsed = cancelPaymentInputSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: "invalid" }
  }

  const payments = paymentsCollection()
  const payment = await payments.findOne({
    _id: new ObjectId(parsed.data.paymentId),
    status: "active",
  })
  if (!payment) {
    return { ok: false, error: "notFound" }
  }
  if (isMonthLocked(payment.date.toISOString().slice(0, 10), condoToday())) {
    return { ok: false, error: "monthLocked" }
  }

  try {
    await withTransaction(async (session) => {
      const cancelled = paymentSchema.parse({
        ...payment,
        status: "cancelled",
        cancelReason: parsed.data.reason,
      })
      await payments.updateOne(
        { _id: payment._id },
        {
          $set: {
            status: cancelled.status,
            cancelReason: cancelled.cancelReason,
          },
        },
        { session }
      )

      const transactions = transactionsCollection()
      const transaction = await transactions.findOne(
        { _id: payment.transactionId },
        { session }
      )
      if (transaction) {
        const updated = transactionSchema.parse({
          ...transaction,
          status: "cancelled",
          cancelReason: parsed.data.reason,
          updatedAt: new Date(),
        })
        await transactions.updateOne(
          { _id: transaction._id },
          {
            $set: {
              status: updated.status,
              cancelReason: updated.cancelReason,
              updatedAt: updated.updatedAt,
            },
          },
          { session }
        )
        await recordAudit(
          {
            actorId: admin._id,
            action: "cancel",
            collection: "transactions",
            documentId: transaction._id,
            before: transaction,
            after: updated,
          },
          session
        )
      }
      await recordAudit(
        {
          actorId: admin._id,
          action: "cancel",
          collection: "payments",
          documentId: payment._id,
          before: payment,
          after: cancelled,
        },
        session
      )

      const charges = chargesCollection()
      for (const allocation of payment.allocations) {
        const charge = await charges.findOne(
          { _id: allocation.chargeId },
          { session }
        )
        if (!charge) continue

        const paidAmount = Math.max(charge.paidAmount - allocation.amount, 0)
        const updated = chargeSchema.parse({
          ...charge,
          paidAmount,
          status: chargeStatus(charge.amount, paidAmount),
        })
        await charges.updateOne(
          { _id: charge._id },
          { $set: { paidAmount: updated.paidAmount, status: updated.status } },
          { session }
        )
      }

      // Credit from the unit's other payments now goes to the reopened charges.
      await applyUnitCredit(payment.unitId, session)
    })
  } catch (saveError) {
    console.error("Cancelling the payment failed", saveError)
    refresh()
    return { ok: false, error: "saveFailed" }
  }

  refresh()
  return { ok: true }
}
