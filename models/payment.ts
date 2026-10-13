import { z } from "zod"

import { getCollection } from "@/lib/mongodb"
import {
  amountSchema,
  cancellableStatusSchema,
  objectIdSchema,
  objectIdStringSchema,
  positiveAmountSchema,
} from "./shared"

export const paymentMethodSchema = z.enum(["wire", "cash"])

export const paymentAllocationSchema = z.object({
  chargeId: objectIdSchema,
  amount: positiveAmountSchema,
})

const sum = (amounts: number[]) =>
  amounts.reduce((total, amount) => total + amount, 0)

const isUnique = (ids: { toString(): string }[]) =>
  new Set(ids.map(String)).size === ids.length

// One unit's part of a payment.
export const paymentUnitSchema = z
  .object({
    unitId: objectIdSchema,
    amount: positiveAmountSchema,
    allocations: z.array(paymentAllocationSchema),
    // Overpayment kept as credit and applied to the unit's next charge.
    unallocatedAmount: amountSchema,
  })
  .refine(
    (unit) =>
      sum(unit.allocations.map(({ amount }) => amount)) +
        unit.unallocatedAmount ===
      unit.amount,
    {
      path: ["allocations"],
      error: "allocations plus unallocatedAmount must equal amount",
    }
  )

export const paymentSchema = z
  .object({
    _id: objectIdSchema,
    date: z.date(),
    amount: positiveAmountSchema,
    method: paymentMethodSchema,
    accountId: objectIdSchema,
    // Its reference on the bank statement (the "folio"), when it has one.
    reference: z.string().trim().min(1).nullable(),
    // A deposit can pay for several units; each appears once.
    units: z.array(paymentUnitSchema).min(1),
    // The income transaction this payment created.
    transactionId: objectIdSchema,
    status: cancellableStatusSchema,
    cancelReason: z.string().trim().min(1).nullable(),
    recordedBy: objectIdSchema,
    createdAt: z.date(),
  })
  .refine((payment) => isUnique(payment.units.map(({ unitId }) => unitId)), {
    path: ["units"],
    error: "a unit can only appear once",
  })
  .refine(
    (payment) =>
      sum(payment.units.map(({ amount }) => amount)) === payment.amount,
    { path: ["units"], error: "the units' amounts must add up to amount" }
  )
  .refine(
    (payment) => (payment.status === "cancelled") === (payment.cancelReason !== null),
    {
      path: ["cancelReason"],
      error: "cancelReason is required when cancelled, and only then",
    }
  )

// What the admin enters; the date is a calendar date, "YYYY-MM-DD". Every
// centavo is assigned: to a charge, or to a unit's credit.
export const paymentInputSchema = z
  .object({
    amount: positiveAmountSchema,
    date: z.iso.date(),
    method: paymentMethodSchema,
    accountId: objectIdStringSchema,
    reference: z.string().trim().min(1).nullable(),
    units: z
      .array(
        z.object({
          unitId: objectIdStringSchema,
          allocations: z.array(
            z.object({
              chargeId: objectIdStringSchema,
              amount: positiveAmountSchema,
            })
          ),
          credit: amountSchema,
        })
      )
      .min(1),
  })
  .refine(
    (input) =>
      isUnique(input.units.map(({ unitId }) => unitId)) &&
      isUnique(
        input.units.flatMap((unit) =>
          unit.allocations.map(({ chargeId }) => chargeId)
        )
      ),
    { path: ["units"], error: "a unit or a charge can only appear once" }
  )
  .refine(
    (input) =>
      sum(
        input.units.map(
          (unit) =>
            unit.credit + sum(unit.allocations.map(({ amount }) => amount))
        )
      ) === input.amount,
    { path: ["units"], error: "the parts must add up to amount" }
  )

export const cancelPaymentInputSchema = z.object({
  paymentId: objectIdStringSchema,
  reason: z.string().trim().min(1),
})

export type PaymentAllocation = z.infer<typeof paymentAllocationSchema>
export type PaymentUnit = z.infer<typeof paymentUnitSchema>
export type Payment = z.infer<typeof paymentSchema>

export const paymentsCollection = () => getCollection<Payment>("payments")
