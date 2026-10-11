"use server"

import { refresh } from "next/cache"
import { ObjectId } from "mongodb"

import { recordAudit } from "@/lib/audit"
import { getAccessibleUnit } from "@/lib/data/unit-accounts"
import { objectIdStringSchema } from "@/models/shared"
import {
  plateInputSchema,
  tenantInputSchema,
  unitSchema,
  unitsCollection,
  type Unit,
} from "@/models/unit"

export type UnitRecordResult =
  | { ok: true }
  | { ok: false; error: "invalid" | "notFound" | "saveFailed" }

const calendarDate = (date: string) => new Date(`${date}T00:00:00Z`)

// Tenants and licence plates are kept by the unit's owners; the admin can
// edit them for any unit. `change` returns the unit's new tenants and parking
// spaces, or null when what it should change is not there.
async function changeUnit(
  unitId: unknown,
  change: (unit: Unit) => Pick<Unit, "tenants" | "parkingSpaces"> | null
): Promise<UnitRecordResult> {
  const access = await getAccessibleUnit(unitId)
  if (!access) {
    return { ok: false, error: "notFound" }
  }
  const { unit, user } = access

  const changed = change(unit)
  if (!changed) {
    return { ok: false, error: "notFound" }
  }

  try {
    const saved = unitSchema.parse({
      ...unit,
      ...changed,
      updatedAt: new Date(),
    })
    await unitsCollection().updateOne(
      { _id: unit._id },
      {
        $set: {
          tenants: saved.tenants,
          parkingSpaces: saved.parkingSpaces,
          updatedAt: saved.updatedAt,
        },
      }
    )
    await recordAudit({
      actorId: user._id,
      action: "update",
      collection: "units",
      documentId: unit._id,
      before: unit,
      after: saved,
    })
  } catch (saveError) {
    console.error("Saving the unit's records failed", saveError)
    return { ok: false, error: "saveFailed" }
  }

  refresh()
  return { ok: true }
}

// Adds a tenant (no tenant id) or saves changes to one.
export async function saveTenant(
  unitId: unknown,
  tenantId: unknown,
  input: unknown
): Promise<UnitRecordResult> {
  const parsedId = objectIdStringSchema.nullable().safeParse(tenantId)
  const parsed = tenantInputSchema.safeParse(input)
  if (!parsedId.success || !parsed.success) {
    return { ok: false, error: "invalid" }
  }

  const values = {
    ...parsed.data,
    from: calendarDate(parsed.data.from),
    to: parsed.data.to ? calendarDate(parsed.data.to) : null,
  }

  return changeUnit(unitId, (unit) => {
    if (!parsedId.data) {
      return {
        tenants: [...unit.tenants, { _id: new ObjectId(), ...values }],
        parkingSpaces: unit.parkingSpaces,
      }
    }
    if (!unit.tenants.some((tenant) => tenant._id.equals(parsedId.data!))) {
      return null
    }
    return {
      tenants: unit.tenants.map((tenant) =>
        tenant._id.equals(parsedId.data!) ? { _id: tenant._id, ...values } : tenant
      ),
      parkingSpaces: unit.parkingSpaces,
    }
  })
}

export async function removeTenant(
  unitId: unknown,
  tenantId: unknown
): Promise<UnitRecordResult> {
  const parsedId = objectIdStringSchema.safeParse(tenantId)
  if (!parsedId.success) {
    return { ok: false, error: "invalid" }
  }

  return changeUnit(unitId, (unit) =>
    unit.tenants.some((tenant) => tenant._id.equals(parsedId.data))
      ? {
          tenants: unit.tenants.filter(
            (tenant) => !tenant._id.equals(parsedId.data)
          ),
          parkingSpaces: unit.parkingSpaces,
        }
      : null
  )
}

// Allows a licence plate on one of the unit's parking spaces.
export async function addPlate(
  unitId: unknown,
  spaceId: unknown,
  input: unknown
): Promise<UnitRecordResult> {
  const parsedId = objectIdStringSchema.safeParse(spaceId)
  const parsed = plateInputSchema.safeParse(input)
  if (!parsedId.success || !parsed.success) {
    return { ok: false, error: "invalid" }
  }

  return changeUnit(unitId, (unit) =>
    unit.parkingSpaces.some((space) => space._id.equals(parsedId.data))
      ? {
          tenants: unit.tenants,
          parkingSpaces: unit.parkingSpaces.map((space) =>
            space._id.equals(parsedId.data)
              ? {
                  ...space,
                  plates: [
                    ...space.plates,
                    { _id: new ObjectId(), ...parsed.data },
                  ],
                }
              : space
          ),
        }
      : null
  )
}

export async function removePlate(
  unitId: unknown,
  plateId: unknown
): Promise<UnitRecordResult> {
  const parsedId = objectIdStringSchema.safeParse(plateId)
  if (!parsedId.success) {
    return { ok: false, error: "invalid" }
  }

  return changeUnit(unitId, (unit) => ({
    tenants: unit.tenants,
    parkingSpaces: unit.parkingSpaces.map((space) => ({
      ...space,
      plates: space.plates.filter((plate) => !plate._id.equals(parsedId.data)),
    })),
  }))
}
