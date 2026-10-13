// Payment rules shared by the server and the dialog that previews them.
// Nothing here may import the database: Client Components use it too.

import { nextPeriod, splitByShares } from "@/lib/fees"

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

// How a payment for several units is spread before the admin adjusts it: the
// oldest charge first across all of them, and what is left over as credit,
// split between the units by ownership share. Amounts are keyed by charge id
// and by unit id.
export function distributePayment(
  units: {
    id: string
    ownershipShare: number
    // Oldest first.
    charges: { id: string; remaining: number; dueDate: string }[]
  }[],
  amount: number
): { allocations: Record<string, number>; credits: Record<string, number> } {
  const charges = units
    .flatMap((unit) => unit.charges)
    // Stable, so units keep their order within a due date.
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  const { allocations, unallocated } = allocateOldestFirst(charges, amount)
  const credits = splitByShares(
    unallocated,
    units.map((unit) => unit.ownershipShare)
  )

  return {
    allocations: Object.fromEntries(
      allocations.map((allocation) => [allocation.charge.id, allocation.amount])
    ),
    credits: Object.fromEntries(
      units.map((unit, index) => [unit.id, credits[index]])
    ),
  }
}

// A month's payments can be recorded or cancelled until 7 days after it ends.
// Both dates are calendar dates, "YYYY-MM-DD".
export function isMonthLocked(date: string, today: string): boolean {
  return today > `${nextPeriod(date.slice(0, 7))}-07`
}
