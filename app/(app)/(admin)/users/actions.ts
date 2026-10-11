"use server"

import { refresh } from "next/cache"
import { ObjectId } from "mongodb"

import { recordAudit } from "@/lib/audit"
import { requireAdmin } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { objectIdStringSchema } from "@/models/shared"
import {
  userInputSchema,
  userSchema,
  userUpdateSchema,
  usersCollection,
} from "@/models/user"

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

export type UpdateUserResult =
  | { ok: true }
  | { ok: false; error: "invalid" | "notFound" | "self" | "saveFailed" }

// Saves the details the admin can change, including the role and committee
// membership.
export async function updateUser(
  id: unknown,
  input: unknown
): Promise<UpdateUserResult> {
  const admin = await requireAdmin()

  const parsedId = objectIdStringSchema.safeParse(id)
  const parsed = userUpdateSchema.safeParse(input)
  if (!parsedId.success || !parsed.success) {
    return { ok: false, error: "invalid" }
  }

  const users = usersCollection()
  const user = await users.findOne({ _id: new ObjectId(parsedId.data) })
  if (!user) {
    return { ok: false, error: "notFound" }
  }
  // Giving up the admin role oneself could leave the condo without an admin.
  if (user._id.equals(admin._id) && parsed.data.role !== "admin") {
    return { ok: false, error: "self" }
  }

  try {
    const { _id, ...fields } = userSchema.parse({
      ...user,
      ...parsed.data,
      updatedAt: new Date(),
    })
    await users.updateOne({ _id }, { $set: fields })
    await recordAudit({
      actorId: admin._id,
      action: "update",
      collection: "users",
      documentId: _id,
      before: user,
      after: { _id, ...fields },
    })
  } catch (saveError) {
    console.error("Saving the user failed", saveError)
    return { ok: false, error: "saveFailed" }
  }

  refresh()
  return { ok: true }
}

// Deactivates an account, or gives access back. A deactivated user cannot
// use the app; their document and history are kept.
export async function setUserActive(
  id: unknown,
  active: unknown
): Promise<UpdateUserResult> {
  const admin = await requireAdmin()

  const parsedId = objectIdStringSchema.safeParse(id)
  if (!parsedId.success || typeof active !== "boolean") {
    return { ok: false, error: "invalid" }
  }

  const users = usersCollection()
  const user = await users.findOne({ _id: new ObjectId(parsedId.data) })
  if (!user) {
    return { ok: false, error: "notFound" }
  }
  if (user._id.equals(admin._id)) {
    return { ok: false, error: "self" }
  }

  try {
    const { _id, ...fields } = userSchema.parse({
      ...user,
      status: active ? "active" : "deactivated",
      updatedAt: new Date(),
    })
    await users.updateOne({ _id }, { $set: fields })
    await recordAudit({
      actorId: admin._id,
      action: "update",
      collection: "users",
      documentId: _id,
      before: user,
      after: { _id, ...fields },
    })

    // Also closed at Supabase, so no session can be opened or refreshed. The
    // app checks the status itself, so a failure here does not undo it.
    const { error } = await createAdminClient().auth.admin.updateUserById(
      user.supabaseUserId,
      { ban_duration: active ? "none" : "876000h" }
    )
    if (error) {
      console.error("Updating the Supabase ban failed", error)
    }
  } catch (saveError) {
    console.error("Changing the user status failed", saveError)
    return { ok: false, error: "saveFailed" }
  }

  refresh()
  return { ok: true }
}
