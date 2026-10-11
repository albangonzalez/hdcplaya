import { z } from "zod"

import { getCollection } from "@/lib/mongodb"
import {
  cancellableStatusSchema,
  objectIdSchema,
  objectIdStringSchema,
  positiveAmountSchema,
} from "./shared"

const transactionBase = {
  _id: objectIdSchema,
  date: z.date(),
  amount: positiveAmountSchema,
  description: z.string().trim().min(1),
  // For a transfer: the source account.
  accountId: objectIdSchema,
  status: cancellableStatusSchema,
  cancelReason: z.string().trim().min(1).nullable(),
  createdBy: objectIdSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
}

export const incomeTransactionSchema = z.object({
  ...transactionBase,
  type: z.literal("income"),
  toAccountId: z.null(),
  categoryId: objectIdSchema,
  // Set when the transaction was created by a recorded payment.
  paymentId: objectIdSchema.nullable(),
})

export const expenseTransactionSchema = z.object({
  ...transactionBase,
  type: z.literal("expense"),
  toAccountId: z.null(),
  categoryId: objectIdSchema,
  paymentId: z.null(),
})

// Moves money between two accounts; left out of income, expenses and results.
export const transferTransactionSchema = z.object({
  ...transactionBase,
  type: z.literal("transfer"),
  toAccountId: objectIdSchema,
  categoryId: z.null(),
  paymentId: z.null(),
})

export const transactionSchema = z
  .discriminatedUnion("type", [
    incomeTransactionSchema,
    expenseTransactionSchema,
    transferTransactionSchema,
  ])
  .refine(
    (transaction) =>
      (transaction.status === "cancelled") === (transaction.cancelReason !== null),
    {
      path: ["cancelReason"],
      error: "cancelReason is required when cancelled, and only then",
    }
  )
  .refine(
    (transaction) =>
      transaction.type !== "transfer" ||
      !transaction.accountId.equals(transaction.toAccountId),
    {
      path: ["toAccountId"],
      error: "A transfer needs two different accounts",
    }
  )

// What the admin enters; the date is a calendar date, "YYYY-MM-DD". A transfer
// has a destination account and no category; the others the opposite.
export const transactionInputSchema = z
  .object({
    type: z.enum(["income", "expense", "transfer"]),
    date: z.iso.date(),
    amount: positiveAmountSchema,
    description: z.string().trim().min(1),
    accountId: objectIdStringSchema,
    toAccountId: objectIdStringSchema.nullable(),
    categoryId: objectIdStringSchema.nullable(),
  })
  .refine(
    (input) =>
      input.type === "transfer"
        ? input.toAccountId !== null &&
          input.categoryId === null &&
          input.toAccountId !== input.accountId
        : input.toAccountId === null && input.categoryId !== null
  )

export const cancelTransactionInputSchema = z.object({
  transactionId: objectIdStringSchema,
  reason: z.string().trim().min(1),
})

export type Transaction = z.infer<typeof transactionSchema>

export const transactionsCollection = () =>
  getCollection<Transaction>("transactions")
