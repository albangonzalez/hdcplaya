"use server"

import { refresh } from "next/cache"
import { headers } from "next/headers"
import { ObjectId } from "mongodb"

import { getCurrentUser } from "@/lib/current-user"
import { createAdminClient } from "@/lib/supabase/admin"
import { userInputSchema, userSchema, usersCollection } from "@/models/user"

export type CreateUserResult =
  | { ok: true }
  | { ok: false; error: "invalid" | "emailTaken" | "inviteFailed" | "saveFailed" }

// Invites the person through Supabase, then stores the user document with the
// id Supabase gave them.
export async function createUser(input: unknown): Promise<CreateUserResult> {
  const currentUser = await getCurrentUser()
  if (currentUser?.profile?.role !== "admin") {
    throw new Error("Only an admin can create users")
  }

  const parsed = userInputSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: "invalid" }
  }

  const users = usersCollection()
  if (await users.findOne({ email: parsed.data.email })) {
    return { ok: false, error: "emailTaken" }
  }

  // The e-mailed link comes back to /auth/confirm, which opens the session.
  // The URL must be in Supabase's allowed redirect URLs, or the Site URL is used.
  const origin = (await headers()).get("origin")
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
    await users.insertOne(
      userSchema.parse({
        ...parsed.data,
        _id: new ObjectId(),
        supabaseUserId: data.user.id,
        status: "invited",
        createdAt: now,
        updatedAt: now,
      })
    )
  } catch (insertError) {
    // Without a document the invited account would have no profile: undo it.
    console.error("Saving the invited user failed", insertError)
    await supabase.auth.admin.deleteUser(data.user.id)
    return { ok: false, error: "saveFailed" }
  }

  refresh()
  return { ok: true }
}
