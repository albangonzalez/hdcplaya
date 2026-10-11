import { getCurrentUser } from "@/lib/current-user"
import type { MenuRole } from "@/lib/menu"
import type { User } from "@/models/user"

// What a user may see: a committee member is an owner with the flag set.
export function getRole(user: User): MenuRole {
  if (user.role === "admin") return "admin"
  return user.isCommittee ? "committee" : "owner"
}

// The signed-in user's document. Throws for anyone without access: no
// session, no document (never invited) or a deactivated account. Layouts are
// not re-run on every navigation, so queries and actions call these too.
export async function requireUser(): Promise<User> {
  const currentUser = await getCurrentUser()
  const profile = currentUser?.profile
  if (!profile || profile.status === "deactivated") {
    throw new Error("Not allowed")
  }
  return profile
}

export async function requireAdmin(): Promise<User> {
  const user = await requireUser()
  if (user.role !== "admin") {
    throw new Error("Only an admin can do this")
  }
  return user
}

// The admin and the Comité de Vigilancia.
export async function requireOversight(): Promise<User> {
  const user = await requireUser()
  if (getRole(user) === "owner") {
    throw new Error("Only the committee and the admin can do this")
  }
  return user
}
