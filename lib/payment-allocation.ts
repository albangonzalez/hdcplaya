import type { ClientSession, ObjectId } from "mongodb"

import { allocateOldestFirst, chargeStatus } from "@/lib/payments"
import { chargeSchema, chargesCollection } from "@/models/charge"
import { paymentSchema, paymentsCollection } from "@/models/payment"

// Applies what a unit's payments have not been used for yet to its unpaid
// charges, oldest charge first. A new payment starts fully unapplied, so this
// is also what applies it; and it is what uses up a credit when a later
// charge is created.
export async function applyUnitCredit(
  unitId: ObjectId,
  session?: ClientSession
): Promise<void> {
  const payments = await paymentsCollection()
    .find(
      { unitId, status: "active", unallocatedAmount: { $gt: 0 } },
      { session }
    )
    .sort({ date: 1, createdAt: 1 })
    .toArray()
  if (payments.length === 0) return

  const charges = await chargesCollection()
    .find({ unitId, status: { $in: ["open", "partial"] } }, { session })
    .sort({ dueDate: 1, _id: 1 })
    .toArray()
  const open = charges.map((charge) => ({
    charge,
    remaining: charge.amount - charge.paidAmount,
  }))

  for (const payment of payments) {
    const { allocations, unallocated } = allocateOldestFirst(
      open,
      payment.unallocatedAmount
    )
    if (allocations.length === 0) break

    for (const allocation of allocations) {
      allocation.charge.remaining -= allocation.amount
    }

    const updated = paymentSchema.parse({
      ...payment,
      allocations: [
        ...payment.allocations,
        ...allocations.map((allocation) => ({
          chargeId: allocation.charge.charge._id,
          amount: allocation.amount,
        })),
      ],
      unallocatedAmount: unallocated,
    })
    await paymentsCollection().updateOne(
      { _id: payment._id },
      {
        $set: {
          allocations: updated.allocations,
          unallocatedAmount: updated.unallocatedAmount,
        },
      },
      { session }
    )
  }

  for (const { charge, remaining } of open) {
    const paidAmount = charge.amount - remaining
    if (paidAmount === charge.paidAmount) continue

    const updated = chargeSchema.parse({
      ...charge,
      paidAmount,
      status: chargeStatus(charge.amount, paidAmount),
    })
    await chargesCollection().updateOne(
      { _id: charge._id },
      { $set: { paidAmount: updated.paidAmount, status: updated.status } },
      { session }
    )
  }
}

// The same, for every unit that holds a credit.
export async function applyCredit(session?: ClientSession): Promise<void> {
  const unitIds = await paymentsCollection().distinct(
    "unitId",
    { status: "active", unallocatedAmount: { $gt: 0 } },
    { session }
  )

  for (const unitId of unitIds) {
    await applyUnitCredit(unitId, session)
  }
}
