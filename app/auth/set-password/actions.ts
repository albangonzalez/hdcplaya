"use server"

import { getCurrentUser } from "@/lib/current-user"
import { usersCollection } from "@/models/user"

// Marks the signed-in user as active once they have set a password. Only an
// invited user changes: a deactivated one stays deactivated.
export async function activateCurrentUser(): Promise<void> {
  const currentUser = await getCurrentUser()
  if (!currentUser) {
    throw new Error("Not signed in")
  }

  await usersCollection().updateOne(
    { supabaseUserId: currentUser.supabaseUserId, status: "invited" },
    { $set: { status: "active", updatedAt: new Date() } }
  )
}
