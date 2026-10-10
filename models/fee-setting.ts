import { z } from "zod"

import { getCollection } from "@/lib/mongodb"
import { amountSchema, objectIdSchema, periodSchema } from "./shared"

// A new document is added each time the budget or due day changes.
export const feeSettingSchema = z.object({
  _id: objectIdSchema,
  effectiveFrom: periodSchema,
  monthlyBudget: amountSchema,
  dueDay: z.int().min(1).max(28),
})

export type FeeSetting = z.infer<typeof feeSettingSchema>

export const feeSettingsCollection = () =>
  getCollection<FeeSetting>("feeSettings")
