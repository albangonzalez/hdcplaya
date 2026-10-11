"use server"

import { refresh } from "next/cache"
import { ObjectId } from "mongodb"

import { recordAudit } from "@/lib/audit"
import { requireAdmin } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { userInputSchema, userSchema, usersCollection } from "@/models/user"

export type CreateUserResult =
  | { ok: true }
  | { ok: false; error: "invalid" | "emailTaken" | "inviteFailed" | "saveFailed" }

// Invites the person through Supabase, then stores the user document with the
// id Supabase gave them.
export async function createUser(input: unknown): Promise<CreateUserResult> {
  const admin = await requireAdmin()

  const parsed = userInputSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: "invalid" }
  }

  const users = usersCollection()
  if (await users.findOne({ email: parsed.data.email })) {
    return { ok: false, error: "emailTaken" }
  }

  // The e-mailed link goes to the Site URL set in Supabase (/auth/confirm).
  const supabase = createAdminClient()
  const { data, error } = await supabase.auth.admin.inviteUserByEmail(
    parsed.data.email
  )

  if (error || !data.user) {
    if (error?.code === "email_exists") {
      return { ok: false, error: "emailTaken" }
    }
    console.error("Supabase invitation failed", error)
    return { ok: false, error: "inviteFailed" }
  }

  try {
    const now = new Date()
    const user = userSchema.parse({
      ...parsed.data,
      _id: new ObjectId(),
      supabaseUserId: data.user.id,
      status: "invited",
      createdAt: now,
      updatedAt: now,
    })
    await users.insertOne(user)
    await recordAudit({
      actorId: admin._id,
      action: "create",
      collection: "users",
      documentId: user._id,
      after: user,
    })
  } catch (insertError) {
    // Without a document the invited account would have no profile: undo it.
    console.error("Saving the invited user failed", insertError)
    await supabase.auth.admin.deleteUser(data.user.id)
    return { ok: false, error: "saveFailed" }
  }

  refresh()
  return { ok: true }
}
