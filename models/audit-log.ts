import { z } from "zod"

import { getCollection } from "@/lib/mongodb"
import { objectIdSchema } from "./shared"

export const auditActionSchema = z.enum(["create", "update", "cancel"])

export const auditedCollectionSchema = z.enum([
  "users",
  "units",
  "feeSettings",
  "specialAssessments",
  "charges",
  "payments",
  "accounts",
  "categories",
  "transactions",
  "files",
])

const snapshotSchema = z.record(z.string(), z.unknown()).nullable()

// Append-only: entries are never updated or removed.
export const auditLogSchema = z.object({
  _id: objectIdSchema,
  actorId: objectIdSchema,
  action: auditActionSchema,
  collection: auditedCollectionSchema,
  documentId: objectIdSchema,
  before: snapshotSchema,
  after: snapshotSchema,
  at: z.date(),
})

export type AuditLog = z.infer<typeof auditLogSchema>

export const auditLogsCollection = () => getCollection<AuditLog>("auditLogs")
