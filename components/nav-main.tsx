"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { getMenuIcon, isMenuItemActive, type MenuGroup } from "@/lib/menu"

export function NavMain({ group }: { group: MenuGroup }) {
  const t = useTranslations("Menu")
  const pathname = usePathname()

  return (
    <SidebarGroup>
      {group.label && <SidebarGroupLabel>{t(group.label)}</SidebarGroupLabel>}
      <SidebarGroupContent>
        <SidebarMenu>
          {group.items.map((item) => {
            const Icon = getMenuIcon(item.icon)
            return (
              <SidebarMenuItem key={item.id}>
                <SidebarMenuButton
                  tooltip={t(item.label)}
                  isActive={isMenuItemActive(item, pathname)}
                  render={<Link href={item.path} />}
                >
                  <Icon />
                  <span>{t(item.label)}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
