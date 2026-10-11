import { getCurrentUser, getFullName } from "@/lib/current-user"
import { unitsCollection } from "@/models/unit"
import { usersCollection } from "@/models/user"

// Plain values only, so they can be passed to Client Components.
export type OwnerOption = {
  id: string
  fullName: string
}

export type UnitRow = {
  id: string
  identifier: string
  // Shares out of 10,000.
  ownershipShare: number
  // The current owners; past ones stay in the document as history.
  owners: OwnerOption[]
}

export type UnitStats = {
  units: number
  withoutOwner: number
  // Sum over every unit; 10,000 when every share is assigned.
  ownershipShare: number
}

// Layouts are not re-run on every navigation, so the data checks the role too.
async function requireAdmin() {
  const currentUser = await getCurrentUser()
  if (currentUser?.profile?.role !== "admin") {
    throw new Error("Only an admin can read units")
  }
}

export async function getUnitStats(): Promise<UnitStats> {
  await requireAdmin()

  const units = unitsCollection()
  const [count, withoutOwner, shares] = await Promise.all([
    units.countDocuments(),
    units.countDocuments({ owners: { $not: { $elemMatch: { to: null } } } }),
    units
      .aggregate<{ total: number }>([
        { $group: { _id: null, total: { $sum: "$ownershipShare" } } },
      ])
      .toArray(),
  ])

  return { units: count, withoutOwner, ownershipShare: shares[0]?.total ?? 0 }
}

export async function getUnits(): Promise<UnitRow[]> {
  await requireAdmin()

  const units = await unitsCollection()
    .find()
    // Numeric ordering puts "A-2" before "A-12".
    .sort({ identifier: 1 })
    .collation({ locale: "es", numericOrdering: true })
    .toArray()

  const currentOwnerIds = (unit: (typeof units)[number]) =>
    unit.owners.filter((owner) => owner.to === null).map((owner) => owner.userId)

  const owners = await usersCollection()
    .find({ _id: { $in: units.flatMap(currentOwnerIds) } })
    .toArray()
  const ownerNames = new Map(
    owners.map((owner) => [owner._id.toHexString(), getFullName(owner)])
  )

  return units.map((unit) => ({
    id: unit._id.toHexString(),
    identifier: unit.identifier,
    ownershipShare: unit.ownershipShare,
    owners: currentOwnerIds(unit)
      .map((userId) => userId.toHexString())
      .filter((id) => ownerNames.has(id))
      .map((id) => ({ id, fullName: ownerNames.get(id)! }))
      .sort((a, b) => a.fullName.localeCompare(b.fullName, "es")),
  }))
}

// The users a unit can be given to: owners whose account is not deactivated.
export async function getOwnerOptions(): Promise<OwnerOption[]> {
  await requireAdmin()

  const owners = await usersCollection()
    .find({ role: "owner", status: { $ne: "deactivated" } })
    .sort({ firstLastName: 1, firstName: 1 })
    .toArray()

  return owners.map((owner) => ({
    id: owner._id.toHexString(),
    fullName: getFullName(owner),
  }))
}
