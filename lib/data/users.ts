import { getCurrentUser, getFullName } from "@/lib/current-user"
import { usersCollection, type User } from "@/models/user"

// Plain values only, so a row can be passed to Client Components.
export type UserRow = {
  id: string
  fullName: string
  firstName: string
  firstLastName: string
  secondLastName: string | null
  email: string
  role: User["role"]
  isCommittee: boolean
  language: User["language"]
  status: User["status"]
}

export type UserStats = {
  activeOwners: number
  deactivatedAccounts: number
  committeeMembers: number
}

// Layouts are not re-run on every navigation, so the data checks the role too.
async function requireAdmin() {
  const currentUser = await getCurrentUser()
  if (currentUser?.profile?.role !== "admin") {
    throw new Error("Only an admin can read users")
  }
}

export async function getUserStats(): Promise<UserStats> {
  await requireAdmin()

  const users = usersCollection()
  const [activeOwners, deactivatedAccounts, committeeMembers] =
    await Promise.all([
      users.countDocuments({ role: "owner", status: "active" }),
      users.countDocuments({ status: "deactivated" }),
      // Former members who were deactivated no longer count.
      users.countDocuments({
        isCommittee: true,
        status: { $ne: "deactivated" },
      }),
    ])

  return { activeOwners, deactivatedAccounts, committeeMembers }
}

export async function getUsers(): Promise<UserRow[]> {
  await requireAdmin()

  const users = await usersCollection()
    .find()
    .sort({ firstLastName: 1, firstName: 1 })
    .toArray()

  return users.map((user) => ({
    id: user._id.toHexString(),
    fullName: getFullName(user),
    firstName: user.firstName,
    firstLastName: user.firstLastName,
    secondLastName: user.secondLastName,
    email: user.email,
    role: user.role,
    isCommittee: user.isCommittee,
    language: user.language,
    status: user.status,
  }))
}
