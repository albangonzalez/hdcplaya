import { z } from "zod"

import { getCollection } from "@/lib/mongodb"
import { objectIdSchema } from "./shared"

export const accountTypeSchema = z.enum(["bank", "cash"])

// The balance is derived: openingBalance plus the account's transactions.
export const accountSchema = z.object({
  _id: objectIdSchema,
  name: z.string().trim().min(1),
  type: accountTypeSchema,
  openingBalance: z.int(),
  openingDate: z.date(),
  active: z.boolean(),
})

// What the admin enters; the opening date is a calendar date, "YYYY-MM-DD".
export const accountInputSchema = z.object({
  name: z.string().trim().min(1),
  type: accountTypeSchema,
  openingBalance: z.int(),
  openingDate: z.iso.date(),
  active: z.boolean(),
})

export type Account = z.infer<typeof accountSchema>

export const accountsCollection = () => getCollection<Account>("accounts")
