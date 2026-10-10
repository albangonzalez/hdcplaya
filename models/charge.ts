import { z } from "zod"

import { getCollection } from "@/lib/mongodb"
import { amountSchema, objectIdSchema, periodSchema } from "./shared"

export const chargeStatusSchema = z.enum([
  "open",
  "partial",
  "paid",
  "cancelled",
])

const chargeBase = {
  _id: objectIdSchema,
  unitId: objectIdSchema,
  amount: amountSchema,
  paidAmount: amountSchema,
  dueDate: z.date(),
  status: chargeStatusSchema,
}

// A unit's share of a month's fee.
export const regularChargeSchema = z.object({
  ...chargeBase,
  kind: z.literal("regular"),
  period: periodSchema,
  specialAssessmentId: z.null(),
})

// A unit's share of a special assessment.
export const specialChargeSchema = z.object({
  ...chargeBase,
  kind: z.literal("special"),
  period: z.null(),
  specialAssessmentId: objectIdSchema,
})

export const chargeSchema = z
  .discriminatedUnion("kind", [regularChargeSchema, specialChargeSchema])
  .refine((charge) => charge.paidAmount <= charge.amount, {
    path: ["paidAmount"],
    error: "paidAmount cannot exceed amount",
  })

export type Charge = z.infer<typeof chargeSchema>

export const chargesCollection = () => getCollection<Charge>("charges")
