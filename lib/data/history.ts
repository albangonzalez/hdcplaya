import { getRole, requireUser } from "@/lib/auth"
import { getFullName } from "@/lib/current-user"
import { auditLogsCollection, type AuditLog } from "@/models/audit-log"
import { usersCollection } from "@/models/user"

// Plain values only. `at` is an ISO string.
export type HistoryRow = {
  id: string
  at: string
  actor: string
  action: AuditLog["action"]
  collection: AuditLog["collection"]
  // The top-level fields whose value changed; empty for a creation.
  changedFields: string[]
}

const HISTORY_LIMIT = 200

// Bookkeeping fields that change on every save say nothing by themselves.
const IGNORED_FIELDS = new Set(["updatedAt"])

function changedFields(entry: AuditLog): string[] {
  if (!entry.before || !entry.after) return []
  const { before, after } = entry

  return [...new Set([...Object.keys(before), ...Object.keys(after)])].filter(
    (field) =>
      !IGNORED_FIELDS.has(field) &&
      JSON.stringify(before[field]) !== JSON.stringify(after[field])
  )
}

// The latest changes, newest first, for the Comité de Vigilancia and the
// admin. Returns null for anyone else.
export async function getHistory(): Promise<HistoryRow[] | null> {
  const user = await requireUser()
  if (getRole(user) === "owner") return null

  const entries = await auditLogsCollection()
    .find()
    .sort({ at: -1 })
    .limit(HISTORY_LIMIT)
    .toArray()
  const actors = await usersCollection()
    .find({ _id: { $in: entries.map((entry) => entry.actorId) } })
    .toArray()
  const names = new Map(
    actors.map((actor) => [actor._id.toHexString(), getFullName(actor)])
  )

  return entries.map((entry) => ({
    id: entry._id.toHexString(),
    at: entry.at.toISOString(),
    actor: names.get(entry.actorId.toHexString()) ?? "",
    action: entry.action,
    collection: entry.collection,
    changedFields: changedFields(entry),
  }))
}
