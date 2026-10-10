import { redirect } from "next/navigation"

import { getCurrentUser } from "@/lib/current-user"

// Admin-only pages. The (app) layout above has already handled signed-out users.
export default async function AdminLayout({ children }: LayoutProps<"/">) {
  const currentUser = await getCurrentUser()

  if (currentUser?.profile?.role !== "admin") {
    redirect("/")
  }

  return children
}
