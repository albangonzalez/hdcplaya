import type { ClientSession, ObjectId } from "mongodb"

import { allocateOldestFirst, chargeStatus } from "@/lib/payments"
import { chargeSchema, chargesCollection } from "@/models/charge"
import { paymentSchema, paymentsCollection } from "@/models/payment"

// Applies what a unit's payments have not been used for yet to its unpaid
// charges, oldest charge first: this is what uses up a credit when a later
// charge is created, or when a cancelled payment reopens one. Only the unit's
// own part of a payment is touched.
export async function applyUnitCredit(
  unitId: ObjectId,
  session?: ClientSession
): Promise<void> {
  const payments = await paymentsCollection()
    .find(
      {
        status: "active",
        units: { $elemMatch: { unitId, unallocatedAmount: { $gt: 0 } } },
      },
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
    const part = payment.units.find((unit) => unit.unitId.equals(unitId))
    if (!part) continue

    const { allocations, unallocated } = allocateOldestFirst(
      open,
      part.unallocatedAmount
    )
    if (allocations.length === 0) break

    for (const allocation of allocations) {
      allocation.charge.remaining -= allocation.amount
    }

    const updated = paymentSchema.parse({
      ...payment,
      units: payment.units.map((unit) =>
        unit === part
          ? {
              ...unit,
              allocations: [
                ...unit.allocations,
                ...allocations.map((allocation) => ({
                  chargeId: allocation.charge.charge._id,
                  amount: allocation.amount,
                })),
              ],
              unallocatedAmount: unallocated,
            }
          : unit
      ),
    })
    await paymentsCollection().updateOne(
      { _id: payment._id },
      { $set: { units: updated.units } },
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
  const payments = await paymentsCollection()
    .find(
      { status: "active", "units.unallocatedAmount": { $gt: 0 } },
      { session, projection: { units: 1 } }
    )
    .toArray()
  const unitIds = new Map(
    payments
      .flatMap((payment) => payment.units)
      .filter((unit) => unit.unallocatedAmount > 0)
      .map((unit) => [unit.unitId.toHexString(), unit.unitId])
  )

  for (const unitId of unitIds.values()) {
    await applyUnitCredit(unitId, session)
  }
}
