"use server"

import { refresh } from "next/cache"
import { ObjectId } from "mongodb"

import { recordAudit } from "@/lib/audit"
import { requireAdmin } from "@/lib/auth"
import {
  categoriesCollection,
  categoryInputSchema,
  categorySchema,
} from "@/models/category"
import { objectIdStringSchema } from "@/models/shared"

export type SaveCategoryResult =
  | { ok: true }
  | { ok: false; error: "invalid" | "notFound" | "system" | "saveFailed" }

// Creates a category (no id) or saves changes to one.
export async function saveCategory(
  id: unknown,
  input: unknown
): Promise<SaveCategoryResult> {
  const admin = await requireAdmin()

  const parsedId = objectIdStringSchema.nullable().safeParse(id)
  const parsed = categoryInputSchema.safeParse(input)
  if (!parsedId.success || !parsed.success) {
    return { ok: false, error: "invalid" }
  }

  const categories = categoriesCollection()
  const existing = parsedId.data
    ? await categories.findOne({ _id: new ObjectId(parsedId.data) })
    : null
  if (parsedId.data && !existing) {
    return { ok: false, error: "notFound" }
  }
  // The app relies on a system category staying an active one of its kind.
  if (
    existing?.system &&
    (parsed.data.kind !== existing.kind || !parsed.data.active)
  ) {
    return { ok: false, error: "system" }
  }

  try {
    const category = categorySchema.parse({
      _id: existing?._id ?? new ObjectId(),
      ...parsed.data,
      system: existing?.system ?? null,
    })
    await categories.replaceOne({ _id: category._id }, category, {
      upsert: true,
    })
    await recordAudit({
      actorId: admin._id,
      action: existing ? "update" : "create",
      collection: "categories",
      documentId: category._id,
      before: existing,
      after: category,
    })
  } catch (saveError) {
    console.error("Saving the category failed", saveError)
    return { ok: false, error: "saveFailed" }
  }

  refresh()
  return { ok: true }
}
