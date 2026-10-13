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
import { chargeSchema, chargesCollection, type Charge } from "@/models/charge"
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
        | "chargesChanged"
        | "creditWithUnpaid"
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

// Thrown inside the transaction when what the admin assigned no longer fits
// the charges, so nothing is saved.
class PaymentRefused extends Error {
  constructor(readonly reason: "chargesChanged" | "creditWithUnpaid") {
    super(reason)
  }
}

// Records a payment made outside the app, for one unit or several. It pays the
// charges the admin assigned it to, what is assigned to no charge stays as
// credit on the unit, and one income transaction is created for the whole
// amount.
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

  const parts = parsed.data.units.map((unit) => ({
    unitId: new ObjectId(unit.unitId),
    allocations: unit.allocations.map((allocation) => ({
      chargeId: new ObjectId(allocation.chargeId),
      amount: allocation.amount,
    })),
    credit: unit.credit,
  }))
  const unitIds = parts.map((part) => part.unitId)
  const accountId = new ObjectId(parsed.data.accountId)
  const [units, account] = await Promise.all([
    unitsCollection()
      .find({ _id: { $in: unitIds } })
      .toArray(),
    accountsCollection().findOne({ _id: accountId, active: true }),
  ])
  if (units.length !== unitIds.length) {
    return { ok: false, error: "unitNotFound" }
  }
  if (!account) {
    return { ok: false, error: "accountNotFound" }
  }
  const identifiers = unitIds.map(
    (unitId) => units.find((unit) => unit._id.equals(unitId))!.identifier
  )

  try {
    await withTransaction(async (session) => {
      const now = new Date()
      const date = new Date(`${parsed.data.date}T00:00:00Z`)
      const paymentId = new ObjectId()
      const transactionId = new ObjectId()

      const charges = chargesCollection()
      const unpaid = await charges
        .find(
          { unitId: { $in: unitIds }, status: { $in: ["open", "partial"] } },
          { session }
        )
        .toArray()
      // Everything is checked before the first write: without a replica set
      // nothing is rolled back.
      const paid: Charge[] = []
      for (const part of parts) {
        const owed = unpaid.filter((charge) => charge.unitId.equals(part.unitId))
        // A charge that is not this unit's, or that is no longer unpaid.
        if (
          part.allocations.some(
            (allocation) =>
              !owed.some((charge) => charge._id.equals(allocation.chargeId))
          )
        ) {
          throw new PaymentRefused("chargesChanged")
        }

        let leftUnpaid = false
        for (const charge of owed) {
          const remaining = charge.amount - charge.paidAmount
          const applied =
            part.allocations.find((allocation) =>
              allocation.chargeId.equals(charge._id)
            )?.amount ?? 0
          if (applied > remaining) {
            throw new PaymentRefused("chargesChanged")
          }
          if (applied < remaining) {
            leftUnpaid = true
          }
          if (applied === 0) continue

          const paidAmount = charge.paidAmount + applied
          paid.push(
            chargeSchema.parse({
              ...charge,
              paidAmount,
              status: chargeStatus(charge.amount, paidAmount),
            })
          )
        }
        // Credit is only kept by a unit that owes nothing: otherwise it would
        // go to its oldest charge at once, not where the admin put it.
        if (part.credit > 0 && leftUnpaid) {
          throw new PaymentRefused("creditWithUnpaid")
        }
      }
      for (const charge of paid) {
        await charges.updateOne(
          { _id: charge._id },
          { $set: { paidAmount: charge.paidAmount, status: charge.status } },
          { session }
        )
      }

      const transaction = transactionSchema.parse({
        _id: transactionId,
        type: "income",
        date,
        amount: parsed.data.amount,
        description: [
          "Pago de cuotas",
          identifiers.join(", "),
          ...(parsed.data.reference ? [`folio ${parsed.data.reference}`] : []),
        ].join(" · "),
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
      const payment = paymentSchema.parse({
        _id: paymentId,
        date,
        amount: parsed.data.amount,
        method: parsed.data.method,
        accountId,
        reference: parsed.data.reference,
        units: parts.map((part) => ({
          unitId: part.unitId,
          amount:
            part.credit +
            part.allocations.reduce((sum, { amount }) => sum + amount, 0),
          allocations: part.allocations,
          unallocatedAmount: part.credit,
        })),
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
    })
  } catch (saveError) {
    refresh()
    if (saveError instanceof PaymentRefused) {
      return { ok: false, error: saveError.reason }
    }
    console.error("Recording the payment failed", saveError)
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
      const allocations = payment.units.flatMap((unit) => unit.allocations)
      for (const allocation of allocations) {
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

      // Credit from the units' other payments now goes to the reopened charges.
      for (const unit of payment.units) {
        await applyUnitCredit(unit.unitId, session)
      }
    })
  } catch (saveError) {
    console.error("Cancelling the payment failed", saveError)
    refresh()
    return { ok: false, error: "saveFailed" }
  }

  refresh()
  return { ok: true }
}
