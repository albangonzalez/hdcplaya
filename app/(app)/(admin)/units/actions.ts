"use server"

import { refresh } from "next/cache"
import { ObjectId } from "mongodb"

import { recordAudit } from "@/lib/audit"
import { requireAdmin } from "@/lib/auth"
import { objectIdStringSchema } from "@/models/shared"
import { condoToday } from "@/lib/condo-time"
import { unitInputSchema, unitSchema, unitsCollection } from "@/models/unit"
import { usersCollection } from "@/models/user"

export type SaveUnitResult =
  | { ok: true }
  | {
      ok: false
      error:
        | "invalid"
        | "notFound"
        | "identifierTaken"
        | "futureDate"
        | "saveFailed"
    }

// Creates a unit (no id) or saves its details, parking spaces and current
// owners. Owners are never removed from the document: one who leaves gets an
// end date, one who arrives a new entry, both on the date given.
export async function saveUnit(
  id: unknown,
  input: unknown
): Promise<SaveUnitResult> {
  const admin = await requireAdmin()

  const parsedId = objectIdStringSchema.nullable().safeParse(id)
  const parsed = unitInputSchema.safeParse(input)
  if (!parsedId.success || !parsed.success) {
    return { ok: false, error: "invalid" }
  }
  if (parsed.data.ownersChangedOn > condoToday()) {
    return { ok: false, error: "futureDate" }
  }

  const units = unitsCollection()
  const unit = parsedId.data
    ? await units.findOne({ _id: new ObjectId(parsedId.data) })
    : null
  if (parsedId.data && !unit) {
    return { ok: false, error: "notFound" }
  }

  const unitId = unit?._id ?? new ObjectId()
  const { identifier, ownershipShare } = parsed.data
  if (await units.findOne({ identifier, _id: { $ne: unitId } })) {
    return { ok: false, error: "identifierTaken" }
  }

  const previousOwners = unit?.owners ?? []
  const ownerIds = new Set(parsed.data.ownerIds)
  const currentOwnerIds = new Set(
    previousOwners
      .filter((owner) => owner.to === null)
      .map((owner) => owner.userId.toHexString())
  )
  const addedOwnerIds = [...ownerIds]
    .filter((ownerId) => !currentOwnerIds.has(ownerId))
    .map((ownerId) => new ObjectId(ownerId))

  // Only a user with the owner role can be given a unit.
  if (addedOwnerIds.length > 0) {
    const found = await usersCollection().countDocuments({
      _id: { $in: addedOwnerIds },
      role: "owner",
    })
    if (found !== addedOwnerIds.length) {
      return { ok: false, error: "invalid" }
    }
  }

  try {
    const now = new Date()
    const changedOn = new Date(`${parsed.data.ownersChangedOn}T00:00:00Z`)
    const previousSpaces = unit?.parkingSpaces ?? []
    const saved = unitSchema.parse({
      _id: unitId,
      identifier,
      ownershipShare,
      owners: [
        ...previousOwners.map((owner) =>
          owner.to === null && !ownerIds.has(owner.userId.toHexString())
            ? { ...owner, to: changedOn }
            : owner
        ),
        ...addedOwnerIds.map((userId) => ({
          userId,
          from: changedOn,
          to: null,
        })),
      ],
      tenants: unit?.tenants ?? [],
      parkingSpaces: parsed.data.parkingSpaces.map((space) => ({
        _id: space.id ? new ObjectId(space.id) : new ObjectId(),
        label: space.label,
        plates:
          previousSpaces.find(
            (previous) => space.id !== null && previous._id.equals(space.id)
          )?.plates ?? [],
      })),
      createdAt: unit?.createdAt ?? now,
      updatedAt: now,
    })
    await units.replaceOne({ _id: unitId }, saved, { upsert: true })
    await recordAudit({
      actorId: admin._id,
      action: unit ? "update" : "create",
      collection: "units",
      documentId: unitId,
      before: unit,
      after: saved,
    })
  } catch (saveError) {
    console.error("Saving the unit failed", saveError)
    return { ok: false, error: "saveFailed" }
  }

  refresh()
  return { ok: true }
}
