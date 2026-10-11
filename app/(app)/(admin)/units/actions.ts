"use server"

import { refresh } from "next/cache"
import { ObjectId } from "mongodb"

import { getCurrentUser } from "@/lib/current-user"
import { objectIdStringSchema } from "@/models/shared"
import { unitInputSchema, unitSchema, unitsCollection } from "@/models/unit"
import { usersCollection } from "@/models/user"

export type UpdateUnitResult =
  | { ok: true }
  | {
      ok: false
      error: "invalid" | "notFound" | "identifierTaken" | "saveFailed"
    }

// Saves a unit's details and its current owners. Owners are never removed from
// the document: one who leaves gets an end date, one who arrives a new entry.
export async function updateUnit(
  id: unknown,
  input: unknown
): Promise<UpdateUnitResult> {
  const currentUser = await getCurrentUser()
  if (currentUser?.profile?.role !== "admin") {
    throw new Error("Only an admin can edit units")
  }

  const parsedId = objectIdStringSchema.safeParse(id)
  const parsed = unitInputSchema.safeParse(input)
  if (!parsedId.success || !parsed.success) {
    return { ok: false, error: "invalid" }
  }

  const units = unitsCollection()
  const unitId = new ObjectId(parsedId.data)
  const unit = await units.findOne({ _id: unitId })
  if (!unit) {
    return { ok: false, error: "notFound" }
  }

  const { identifier, ownershipShare } = parsed.data
  if (await units.findOne({ identifier, _id: { $ne: unitId } })) {
    return { ok: false, error: "identifierTaken" }
  }

  const ownerIds = new Set(parsed.data.ownerIds)
  const currentOwnerIds = new Set(
    unit.owners
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
    const { _id, ...fields } = unitSchema.parse({
      ...unit,
      identifier,
      ownershipShare,
      owners: [
        ...unit.owners.map((owner) =>
          owner.to === null && !ownerIds.has(owner.userId.toHexString())
            ? { ...owner, to: now }
            : owner
        ),
        ...addedOwnerIds.map((userId) => ({ userId, from: now, to: null })),
      ],
      updatedAt: now,
    })
    await units.updateOne({ _id }, { $set: fields })
  } catch (saveError) {
    console.error("Saving the unit failed", saveError)
    return { ok: false, error: "saveFailed" }
  }

  refresh()
  return { ok: true }
}
