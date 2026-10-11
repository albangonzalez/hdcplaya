import { Suspense } from "react"
import { redirect } from "next/navigation"

import { getCurrentUser } from "@/lib/current-user"

// Admin-only pages. The (app) layout above has already handled signed-out users.
// The role check waits for the request, so it sits behind <Suspense>: a
// navigation into these pages then does not block on it.
export default function AdminLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense>
      <AdminOnly>{children}</AdminOnly>
    </Suspense>
  )
}

async function AdminOnly({ children }: { children: React.ReactNode }) {
  const currentUser = await getCurrentUser()

  if (currentUser?.profile?.role !== "admin") {
    redirect("/")
  }

  return children
}
