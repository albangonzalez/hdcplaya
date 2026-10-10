import { redirect } from "next/navigation"

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { getCurrentUser, getFullName } from "@/lib/current-user"

// Shell for every signed-in page: the sidebar and header stay mounted and
// only the right panel (children) changes between pages.
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    redirect("/login")
  }

  const email = currentUser.profile?.email ?? currentUser.email ?? ""
  const sidebarUser = {
    name: currentUser.profile ? getFullName(currentUser.profile) : email,
    email,
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" user={sidebarUser} />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
