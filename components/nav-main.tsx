"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { getMenuIcon, type MenuGroup } from "@/lib/menu"

export function NavMain({ group }: { group: MenuGroup }) {
  const pathname = usePathname()

  return (
    <SidebarGroup>
      {group.label && <SidebarGroupLabel>{group.label}</SidebarGroupLabel>}
      <SidebarGroupContent>
        <SidebarMenu>
          {group.items.map((item) => {
            const Icon = getMenuIcon(item.icon)
            return (
              <SidebarMenuItem key={item.id}>
                <SidebarMenuButton
                  tooltip={item.label}
                  isActive={
                    pathname === item.path ||
                    pathname.startsWith(`${item.path}/`)
                  }
                  render={<Link href={item.path} />}
                >
                  <Icon />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
