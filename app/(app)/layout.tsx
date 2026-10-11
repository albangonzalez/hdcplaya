import { Suspense } from "react"
import { redirect } from "next/navigation"

import { AppSidebar } from "@/components/app-sidebar"
import { LocaleSync } from "@/components/locale-sync"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { getRole } from "@/lib/auth"
import { getCurrentUser, getFullName } from "@/lib/current-user"

// Shell for every signed-in page: the sidebar and header stay mounted and
// only the right panel (children) changes between pages. The session check
// waits for the request, so it sits behind <Suspense>: a navigation from a
// signed-out page then does not block on it.
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense>
      <AppShell>{children}</AppShell>
    </Suspense>
  )
}

async function AppShell({ children }: { children: React.ReactNode }) {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    redirect("/login")
  }

  // Signed in with Supabase but never invited, or deactivated since.
  const profile = currentUser.profile
  if (!profile || profile.status === "deactivated") {
    redirect("/auth/no-access")
  }

  const sidebarUser = { name: getFullName(profile), email: profile.email }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <LocaleSync language={profile.language} />
      <AppSidebar variant="inset" role={getRole(profile)} user={sidebarUser} />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
