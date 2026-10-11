// Payment rules shared by the server and the dialog that previews them.
// Nothing here may import the database: Client Components use it too.

import { nextPeriod } from "@/lib/fees"

export type ChargeStatus = "open" | "partial" | "paid"

export function chargeStatus(amount: number, paidAmount: number): ChargeStatus {
  if (paidAmount >= amount) return "paid"
  return paidAmount > 0 ? "partial" : "open"
}

// Applies `amount` to the charges in the order given (oldest first), each
// with what it still owes. What is left over once they are all paid is the
// unit's credit.
export function allocateOldestFirst<T extends { remaining: number }>(
  charges: T[],
  amount: number
): { allocations: { charge: T; amount: number }[]; unallocated: number } {
  const allocations: { charge: T; amount: number }[] = []
  let unallocated = amount

  for (const charge of charges) {
    if (unallocated === 0) break
    const applied = Math.min(charge.remaining, unallocated)
    if (applied > 0) {
      allocations.push({ charge, amount: applied })
      unallocated -= applied
    }
  }

  return { allocations, unallocated }
}

// A month's payments can be recorded or cancelled until 7 days after it ends.
// Both dates are calendar dates, "YYYY-MM-DD".
export function isMonthLocked(date: string, today: string): boolean {
  return today > `${nextPeriod(date.slice(0, 7))}-07`
}
