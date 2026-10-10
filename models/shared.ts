import { ObjectId } from "mongodb"
import { z } from "zod"

export const objectIdSchema = z.instanceof(ObjectId)

// All amounts are integers in centavos (MXN).
export const amountSchema = z.int().nonnegative()
export const positiveAmountSchema = z.int().positive()

// A calendar month, e.g. "2026-10".
export const periodSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/)

export const nameSchema = z.string().trim().min(1)

// Transactions and payments are cancelled with a reason, never deleted.
export const cancellableStatusSchema = z.enum(["active", "cancelled"])
