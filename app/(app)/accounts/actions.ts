"use server"

import { refresh } from "next/cache"
import { ObjectId } from "mongodb"

import { recordAudit } from "@/lib/audit"
import { requireAdmin } from "@/lib/auth"
import {
  accountInputSchema,
  accountSchema,
  accountsCollection,
} from "@/models/account"
import { objectIdStringSchema } from "@/models/shared"

export type SaveAccountResult =
  | { ok: true }
  | { ok: false; error: "invalid" | "notFound" | "nameTaken" | "saveFailed" }

// Creates an account (no id) or saves changes to one.
export async function saveAccount(
  id: unknown,
  input: unknown
): Promise<SaveAccountResult> {
  const admin = await requireAdmin()

  const parsedId = objectIdStringSchema.nullable().safeParse(id)
  const parsed = accountInputSchema.safeParse(input)
  if (!parsedId.success || !parsed.success) {
    return { ok: false, error: "invalid" }
  }

  const accounts = accountsCollection()
  const existing = parsedId.data
    ? await accounts.findOne({ _id: new ObjectId(parsedId.data) })
    : null
  if (parsedId.data && !existing) {
    return { ok: false, error: "notFound" }
  }

  const _id = existing?._id ?? new ObjectId()
  if (await accounts.findOne({ name: parsed.data.name, _id: { $ne: _id } })) {
    return { ok: false, error: "nameTaken" }
  }

  try {
    const account = accountSchema.parse({
      _id,
      ...parsed.data,
      openingDate: new Date(`${parsed.data.openingDate}T00:00:00Z`),
    })
    await accounts.replaceOne({ _id }, account, { upsert: true })
    await recordAudit({
      actorId: admin._id,
      action: existing ? "update" : "create",
      collection: "accounts",
      documentId: _id,
      before: existing,
      after: account,
    })
  } catch (saveError) {
    console.error("Saving the account failed", saveError)
    return { ok: false, error: "saveFailed" }
  }

  refresh()
  return { ok: true }
}
