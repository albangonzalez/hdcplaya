import { z } from "zod"

import { getCollection } from "@/lib/mongodb"
import { nameSchema, objectIdSchema } from "./shared"

// 100% expressed in 1/10,000 of a percent.
export const OWNERSHIP_SHARE_TOTAL = 1_000_000

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

export type UnitOwner = z.infer<typeof unitOwnerSchema>
export type Tenant = z.infer<typeof tenantSchema>
export type Plate = z.infer<typeof plateSchema>
export type ParkingSpace = z.infer<typeof parkingSpaceSchema>
export type Unit = z.infer<typeof unitSchema>

export const unitsCollection = () => getCollection<Unit>("units")
