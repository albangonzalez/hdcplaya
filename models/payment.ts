import { z } from "zod"

import { getCollection } from "@/lib/mongodb"
import {
  amountSchema,
  cancellableStatusSchema,
  objectIdSchema,
  positiveAmountSchema,
} from "./shared"

export const paymentMethodSchema = z.enum(["wire", "cash"])

export const paymentAllocationSchema = z.object({
  chargeId: objectIdSchema,
  amount: positiveAmountSchema,
})

export const paymentSchema = z
  .object({
    _id: objectIdSchema,
    unitId: objectIdSchema,
    date: z.date(),
    amount: positiveAmountSchema,
    method: paymentMethodSchema,
    accountId: objectIdSchema,
    // Oldest charge first.
    allocations: z.array(paymentAllocationSchema),
    // Overpayment kept as credit and applied to the unit's next charge.
    unallocatedAmount: amountSchema,
    // The income transaction this payment created.
    transactionId: objectIdSchema,
    status: cancellableStatusSchema,
    cancelReason: z.string().trim().min(1).nullable(),
    recordedBy: objectIdSchema,
    createdAt: z.date(),
  })
  .refine(
    (payment) =>
      payment.allocations.reduce((sum, { amount }) => sum + amount, 0) +
        payment.unallocatedAmount ===
      payment.amount,
    {
      path: ["allocations"],
      error: "allocations plus unallocatedAmount must equal amount",
    }
  )
  .refine(
    (payment) => (payment.status === "cancelled") === (payment.cancelReason !== null),
    {
      path: ["cancelReason"],
      error: "cancelReason is required when cancelled, and only then",
    }
  )

export type PaymentAllocation = z.infer<typeof paymentAllocationSchema>
export type Payment = z.infer<typeof paymentSchema>

export const paymentsCollection = () => getCollection<Payment>("payments")
