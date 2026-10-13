import { condoToday } from "@/lib/condo-time"
import { requireAdmin } from "@/lib/auth"
import { getFullName } from "@/lib/current-user"
import { isMonthLocked } from "@/lib/payments"
import { accountsCollection } from "@/models/account"
import { chargesCollection } from "@/models/charge"
import { paymentsCollection, type Payment } from "@/models/payment"
import { specialAssessmentsCollection } from "@/models/special-assessment"
import { unitsCollection } from "@/models/unit"
import { usersCollection } from "@/models/user"

// Plain values only, so they can be passed to Client Components. Amounts are
// centavos and dates are ISO strings.
export type PaymentRow = {
  id: string
  date: string
  // Identifiers of the units it paid for.
  units: string[]
  amount: number
  method: Payment["method"]
  account: string
  // Its reference on the bank statement.
  reference: string | null
  status: Payment["status"]
  cancelReason: string | null
  // Still within the days in which its month can be corrected.
  canCancel: boolean
}

export type PaymentCharge = {
  id: string
  kind: "regular" | "special"
  // "YYYY-MM" for a regular fee, the assessment's description for a special one.
  period: string | null
  description: string | null
  dueDate: string
  remaining: number
}

export type PaymentUnit = {
  id: string
  identifier: string
  ownershipShare: number
  // Unpaid charges, oldest first: the order a payment is spread in.
  charges: PaymentCharge[]
}

// A current owner and their units, to pick them all at once.
export type PaymentOwner = {
  id: string
  fullName: string
  unitIds: string[]
}

export type PaymentFormData = {
  units: PaymentUnit[]
  owners: PaymentOwner[]
  accounts: { id: string; name: string }[]
  // Today's date where the condo is, "YYYY-MM-DD".
  today: string
}

export type PaymentStats = {
  receivedThisMonth: number
  paymentsThisMonth: number
  // What is owed, and the part of it that is past its due date.
  regular: { outstanding: number; overdue: number }
  special: { outstanding: number; overdue: number }
}

export async function getPayments(): Promise<PaymentRow[]> {
  await requireAdmin()

  const [payments, units, accounts] = await Promise.all([
    paymentsCollection().find().sort({ date: -1, createdAt: -1 }).toArray(),
    unitsCollection().find().toArray(),
    accountsCollection().find().toArray(),
  ])
  const unitNames = new Map(
    units.map((unit) => [unit._id.toHexString(), unit.identifier])
  )
  const accountNames = new Map(
    accounts.map((account) => [account._id.toHexString(), account.name])
  )
  const today = condoToday()

  return payments.map((payment) => {
    const date = payment.date.toISOString()
    return {
      id: payment._id.toHexString(),
      date,
      units: payment.units
        .map((unit) => unitNames.get(unit.unitId.toHexString()) ?? "")
        .sort((a, b) => a.localeCompare(b, "es", { numeric: true })),
      amount: payment.amount,
      method: payment.method,
      account: accountNames.get(payment.accountId.toHexString()) ?? "",
      reference: payment.reference,
      status: payment.status,
      cancelReason: payment.cancelReason,
      canCancel:
        payment.status === "active" &&
        !isMonthLocked(date.slice(0, 10), today),
    }
  })
}

export async function getPaymentFormData(): Promise<PaymentFormData> {
  await requireAdmin()

  const [units, charges, assessments, accounts] = await Promise.all([
    unitsCollection()
      .find()
      .sort({ identifier: 1 })
      .collation({ locale: "es", numericOrdering: true })
      .toArray(),
    chargesCollection()
      .find({ status: { $in: ["open", "partial"] } })
      .sort({ dueDate: 1, _id: 1 })
      .toArray(),
    specialAssessmentsCollection().find().toArray(),
    accountsCollection().find({ active: true }).sort({ name: 1 }).toArray(),
  ])
  const descriptions = new Map(
    assessments.map((assessment) => [
      assessment._id.toHexString(),
      assessment.description,
    ])
  )
  const ownedUnits = new Map<string, string[]>()
  for (const unit of units) {
    for (const owner of unit.owners) {
      if (owner.to !== null) continue
      const ownerId = owner.userId.toHexString()
      ownedUnits.set(ownerId, [
        ...(ownedUnits.get(ownerId) ?? []),
        unit._id.toHexString(),
      ])
    }
  }
  const owners = await usersCollection()
    .find({ _id: { $in: units.flatMap((unit) => unit.owners.map((o) => o.userId)) } })
    .toArray()

  return {
    units: units.map((unit) => ({
      id: unit._id.toHexString(),
      identifier: unit.identifier,
      ownershipShare: unit.ownershipShare,
      charges: charges
        .filter((charge) => charge.unitId.equals(unit._id))
        .map((charge) => ({
          id: charge._id.toHexString(),
          kind: charge.kind,
          period: charge.period,
          description:
            charge.kind === "special"
              ? (descriptions.get(charge.specialAssessmentId.toHexString()) ??
                "")
              : null,
          dueDate: charge.dueDate.toISOString(),
          remaining: charge.amount - charge.paidAmount,
        })),
    })),
    owners: owners
      .map((owner) => ({
        id: owner._id.toHexString(),
        fullName: getFullName(owner),
        unitIds: ownedUnits.get(owner._id.toHexString()) ?? [],
      }))
      .filter((owner) => owner.unitIds.length > 0)
      .sort((a, b) => a.fullName.localeCompare(b.fullName, "es")),
    accounts: accounts.map((account) => ({
      id: account._id.toHexString(),
      name: account.name,
    })),
    today: condoToday(),
  }
}

export async function getPaymentStats(): Promise<PaymentStats> {
  await requireAdmin()

  const today = condoToday()
  const monthStart = new Date(`${today.slice(0, 7)}-01T00:00:00Z`)
  const todayDate = new Date(`${today}T00:00:00Z`)
  const remaining = { $subtract: ["$amount", "$paidAmount"] }

  const [received, owed] = await Promise.all([
    paymentsCollection()
      .aggregate<{ amount: number; count: number }>([
        { $match: { status: "active", date: { $gte: monthStart } } },
        {
          $group: { _id: null, amount: { $sum: "$amount" }, count: { $sum: 1 } },
        },
      ])
      .toArray(),
    chargesCollection()
      .aggregate<{ _id: "regular" | "special"; outstanding: number; overdue: number }>([
        { $match: { status: { $in: ["open", "partial"] } } },
        {
          $group: {
            _id: "$kind",
            outstanding: { $sum: remaining },
            // Due today is not overdue yet.
            overdue: {
              $sum: { $cond: [{ $lt: ["$dueDate", todayDate] }, remaining, 0] },
            },
          },
        },
      ])
      .toArray(),
  ])

  const byKind = (kind: "regular" | "special") => {
    const found = owed.find((group) => group._id === kind)
    return {
      outstanding: found?.outstanding ?? 0,
      overdue: found?.overdue ?? 0,
    }
  }

  return {
    receivedThisMonth: received[0]?.amount ?? 0,
    paymentsThisMonth: received[0]?.count ?? 0,
    regular: byKind("regular"),
    special: byKind("special"),
  }
}
