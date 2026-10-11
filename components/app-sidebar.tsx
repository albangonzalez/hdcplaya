"use client"

import * as React from "react"
import Link from "next/link"

import { NavMain } from "@/components/nav-main"
import { NavUser, type NavUserProps } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { getMenu, type MenuRole } from "@/lib/menu"
import { GalleryVerticalEndIcon } from "lucide-react"

export function AppSidebar({
  role,
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  role: MenuRole
  user: NavUserProps["user"]
}) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="data-[slot=sidebar-menu-button]:p-1.5!"
              render={<Link href="/" />}
            >
              <GalleryVerticalEndIcon className="size-5!" />
              <span className="text-base font-semibold">
                Hacienda del Carmen
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {getMenu(role).map((group) => (
          <NavMain key={group.id} group={group} />
        ))}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
