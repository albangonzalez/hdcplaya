import { ObjectId, type ClientSession } from "mongodb"

import {
  auditLogSchema,
  auditLogsCollection,
  type AuditLog,
} from "@/models/audit-log"

type AuditEntry = {
  actorId: ObjectId
  action: AuditLog["action"]
  collection: AuditLog["collection"]
  documentId: ObjectId
  // The document before and after the change; null when there is none
  // (before a creation).
  before?: object | null
  after?: object | null
}

// Adds entries to the change history the committee reads. Every action that
// creates, edits or cancels something calls this with the documents involved.
export async function recordAudit(
  entries: AuditEntry | AuditEntry[],
  session?: ClientSession
): Promise<void> {
  const list = Array.isArray(entries) ? entries : [entries]
  if (list.length === 0) return

  const at = new Date()
  await auditLogsCollection().insertMany(
    list.map((entry) =>
      auditLogSchema.parse({
        _id: new ObjectId(),
        actorId: entry.actorId,
        action: entry.action,
        collection: entry.collection,
        documentId: entry.documentId,
        before: entry.before ?? null,
        after: entry.after ?? null,
        at,
      })
    ),
    { session }
  )
}
