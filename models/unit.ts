import { z } from "zod"

import { getCollection } from "@/lib/mongodb"
import { nameSchema, objectIdSchema, objectIdStringSchema } from "./shared"

// The condo is divided into this many shares; a unit holds some of them.
export const OWNERSHIP_SHARE_TOTAL = 10_000

export const unitOwnerSchema = z.object({
  userId: objectIdSchema,
  from: z.date(),
  to: z.date().nullable(),
})

export const tenantSchema = z.object({
  _id: objectIdSchema,
  firstName: nameSchema,
  firstLastName: nameSchema,
  secondLastName: nameSchema.nullable(),
  contact: z.string().trim(),
  from: z.date(),
  to: z.date().nullable(),
})

export const plateSchema = z.object({
  _id: objectIdSchema,
  plate: z.string().trim().min(1).toUpperCase(),
  note: z.string().trim().nullable(),
})

export const parkingSpaceSchema = z.object({
  _id: objectIdSchema,
  label: z.string().trim().min(1),
  plates: z.array(plateSchema),
})

export const unitSchema = z.object({
  _id: objectIdSchema,
  identifier: z.string().trim().min(1),
  ownershipShare: z.int().min(0).max(OWNERSHIP_SHARE_TOTAL),
  owners: z.array(unitOwnerSchema),
  tenants: z.array(tenantSchema),
  parkingSpaces: z.array(parkingSpaceSchema),
  createdAt: z.date(),
  updatedAt: z.date(),
})

// What the admin enters. `ownerIds` are the users who own the unit now; the
// server turns a change into `owners` history entries.
export const unitInputSchema = z.object({
  identifier: z.string().trim().min(1),
  ownershipShare: z.int().min(0).max(OWNERSHIP_SHARE_TOTAL),
  ownerIds: z.array(objectIdStringSchema),
  // The day a change of owners takes effect, "YYYY-MM-DD".
  ownersChangedOn: z.iso.date(),
  // A space keeps its licence plates through its id; one without an id is new.
  parkingSpaces: z.array(
    z.object({
      id: objectIdStringSchema.nullable(),
      label: z.string().trim().min(1),
    })
  ),
})

export type UnitInput = z.infer<typeof unitInputSchema>

export type UnitOwner = z.infer<typeof unitOwnerSchema>
export type Tenant = z.infer<typeof tenantSchema>
export type Plate = z.infer<typeof plateSchema>
export type ParkingSpace = z.infer<typeof parkingSpaceSchema>
export type Unit = z.infer<typeof unitSchema>

export const unitsCollection = () => getCollection<Unit>("units")
