import { cache } from "react"

import { createClient } from "@/lib/supabase/server"
import { usersCollection, type User } from "@/models/user"

export type CurrentUser = {
  supabaseUserId: string
  email: string | null
  // The MongoDB user document; null when the Supabase user has none.
  profile: User | null
}

// The signed-in user, or null when there is no session. Cached per request.
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims

  if (!claims) {
    return null
  }

  const profile = await usersCollection().findOne({
    supabaseUserId: claims.sub,
  })

  return {
    supabaseUserId: claims.sub,
    email: typeof claims.email === "string" ? claims.email : null,
    profile,
  }
})

export function getFullName(user: User): string {
  return [user.firstName, user.firstLastName, user.secondLastName]
    .filter(Boolean)
    .join(" ")
}
