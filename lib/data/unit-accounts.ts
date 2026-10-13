import { ObjectId } from "mongodb"

import { getRole, requireUser } from "@/lib/auth"
import { condoToday } from "@/lib/condo-time"
import { getFullName } from "@/lib/current-user"
import { chargesCollection, type Charge } from "@/models/charge"
import { paymentsCollection, type Payment } from "@/models/payment"
import { objectIdStringSchema } from "@/models/shared"
import { specialAssessmentsCollection } from "@/models/special-assessment"
import { unitsCollection, type Unit } from "@/models/unit"
import { usersCollection, type User } from "@/models/user"

// Plain values only, so they can be passed to Client Components. Amounts are
// centavos and dates are ISO strings.

// What is owed, and the part of it that is past its due date.
export type Owed = { outstanding: number; overdue: number }

export type UnitBalance = {
  id: string
  identifier: string
  // Names of the current owners.
  owners: string[]
  // Always shown split in two.
  regular: Owed
  special: Owed
  // Paid in advance, waiting for the next charge.
  credit: number
}

export type UnitCharge = {
  id: string
  kind: Charge["kind"]
  // "YYYY-MM" for a regular fee, the assessment's description for a special one.
  period: string | null
  description: string | null
  dueDate: string
  amount: number
  paidAmount: number
  status: Charge["status"]
  overdue: boolean
}

export type UnitPayment = {
  id: string
  date: string
  // The unit's part of the payment, and the whole payment when it also paid
  // for other units.
  amount: number
  total: number
  method: Payment["method"]
  // Its reference on the bank statement.
  reference: string | null
  status: Payment["status"]
}

export type UnitTenant = {
  id: string
  firstName: string
  firstLastName: string
  secondLastName: string | null
  contact: string
  from: string
  to: string | null
}

export type UnitParkingSpace = {
  id: string
  label: string
  plates: { id: string; plate: string; note: string | null }[]
}

export type UnitDetail = {
  balance: UnitBalance
  ownershipShare: number
  charges: UnitCharge[]
  payments: UnitPayment[]
  tenants: UnitTenant[]
  parkingSpaces: UnitParkingSpace[]
  // Today's date where the condo is, "YYYY-MM-DD".
  today: string
}

const isCurrentOwner = (unit: Unit, user: User) =>
  unit.owners.some(
    (owner) => owner.to === null && owner.userId.equals(user._id)
  )

// A unit's detail (charges, payments, tenants, plates) is for its current
// owners and the admin. Returns null for anyone else or an unknown unit.
export async function getAccessibleUnit(
  unitId: unknown
): Promise<{ unit: Unit; user: User } | null> {
  const user = await requireUser()

  const parsed = objectIdStringSchema.safeParse(unitId)
  if (!parsed.success) return null

  const unit = await unitsCollection().findOne({
    _id: new ObjectId(parsed.data),
  })
  if (!unit) return null
  if (getRole(user) !== "admin" && !isCurrentOwner(unit, user)) return null

  return { unit, user }
}

async function toBalances(units: Unit[]): Promise<UnitBalance[]> {
  const unitIds = units.map((unit) => unit._id)
  const ownerIds = units.flatMap((unit) =>
    unit.owners.filter((owner) => owner.to === null).map((o) => o.userId)
  )
  const todayDate = new Date(`${condoToday()}T00:00:00Z`)
  const remaining = { $subtract: ["$amount", "$paidAmount"] }

  const [owed, credits, owners] = await Promise.all([
    chargesCollection()
      .aggregate<{
        _id: { unitId: ObjectId; kind: Charge["kind"] }
        outstanding: number
        overdue: number
      }>([
        {
          $match: {
            unitId: { $in: unitIds },
            status: { $in: ["open", "partial"] },
          },
        },
        {
          $group: {
            _id: { unitId: "$unitId", kind: "$kind" },
            outstanding: { $sum: remaining },
            // Due today is not overdue yet.
            overdue: {
              $sum: { $cond: [{ $lt: ["$dueDate", todayDate] }, remaining, 0] },
            },
          },
        },
      ])
      .toArray(),
    paymentsCollection()
      .aggregate<{ _id: ObjectId; credit: number }>([
        { $match: { "units.unitId": { $in: unitIds }, status: "active" } },
        { $unwind: "$units" },
        { $match: { "units.unitId": { $in: unitIds } } },
        {
          $group: {
            _id: "$units.unitId",
            credit: { $sum: "$units.unallocatedAmount" },
          },
        },
      ])
      .toArray(),
    usersCollection().find({ _id: { $in: ownerIds } }).toArray(),
  ])
  const ownerNames = new Map(
    owners.map((owner) => [owner._id.toHexString(), getFullName(owner)])
  )

  return units.map((unit) => {
    const of = (kind: Charge["kind"]): Owed => {
      const found = owed.find(
        (group) => group._id.unitId.equals(unit._id) && group._id.kind === kind
      )
      return {
        outstanding: found?.outstanding ?? 0,
        overdue: found?.overdue ?? 0,
      }
    }
    return {
      id: unit._id.toHexString(),
      identifier: unit.identifier,
      owners: unit.owners
        .filter((owner) => owner.to === null)
        .map((owner) => ownerNames.get(owner.userId.toHexString()))
        .filter((name) => name !== undefined)
        .sort((a, b) => a.localeCompare(b, "es")),
      regular: of("regular"),
      special: of("special"),
      credit:
        credits.find((group) => group._id.equals(unit._id))?.credit ?? 0,
    }
  })
}

const sortedUnits = (filter: object = {}) =>
  unitsCollection()
    .find(filter)
    .sort({ identifier: 1 })
    .collation({ locale: "es", numericOrdering: true })
    .toArray()

// Transparency rule: every signed-in user sees every unit's balance.
export async function getUnitBalances(): Promise<UnitBalance[]> {
  await requireUser()
  return toBalances(await sortedUnits())
}

// The units the signed-in user currently owns.
export async function getMyUnits(): Promise<UnitBalance[]> {
  const user = await requireUser()
  return toBalances(
    await sortedUnits({ owners: { $elemMatch: { userId: user._id, to: null } } })
  )
}

export async function getUnitDetail(
  unitId: unknown
): Promise<UnitDetail | null> {
  const access = await getAccessibleUnit(unitId)
  if (!access) return null
  const { unit } = access

  const today = condoToday()
  const todayDate = new Date(`${today}T00:00:00Z`)
  const [[balance], charges, payments, assessments] = await Promise.all([
    toBalances([unit]),
    chargesCollection()
      .find({ unitId: unit._id, status: { $ne: "cancelled" } })
      .sort({ dueDate: -1, _id: -1 })
      .toArray(),
    paymentsCollection()
      .find({ "units.unitId": unit._id })
      .sort({ date: -1, createdAt: -1 })
      .toArray(),
    specialAssessmentsCollection().find().toArray(),
  ])
  const descriptions = new Map(
    assessments.map((a) => [a._id.toHexString(), a.description])
  )

  return {
    balance,
    ownershipShare: unit.ownershipShare,
    charges: charges.map((charge) => ({
      id: charge._id.toHexString(),
      kind: charge.kind,
      period: charge.period,
      description:
        charge.kind === "special"
          ? (descriptions.get(charge.specialAssessmentId.toHexString()) ?? "")
          : null,
      dueDate: charge.dueDate.toISOString(),
      amount: charge.amount,
      paidAmount: charge.paidAmount,
      status: charge.status,
      overdue: charge.status !== "paid" && charge.dueDate < todayDate,
    })),
    payments: payments.map((payment) => ({
      id: payment._id.toHexString(),
      date: payment.date.toISOString(),
      amount:
        payment.units.find((part) => part.unitId.equals(unit._id))?.amount ?? 0,
      total: payment.amount,
      method: payment.method,
      reference: payment.reference,
      status: payment.status,
    })),
    tenants: unit.tenants
      .map((tenant) => ({
        id: tenant._id.toHexString(),
        firstName: tenant.firstName,
        firstLastName: tenant.firstLastName,
        secondLastName: tenant.secondLastName,
        contact: tenant.contact,
        from: tenant.from.toISOString(),
        to: tenant.to?.toISOString() ?? null,
      }))
      .sort((a, b) => b.from.localeCompare(a.from)),
    parkingSpaces: unit.parkingSpaces.map((space) => ({
      id: space._id.toHexString(),
      label: space.label,
      plates: space.plates.map((plate) => ({
        id: plate._id.toHexString(),
        plate: plate.plate,
        note: plate.note,
      })),
    })),
    today,
  }
}
