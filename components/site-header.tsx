"use client"

import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"

import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { findMenuItem } from "@/lib/menu"

export function SiteHeader() {
  const t = useTranslations("Menu")
  const pathname = usePathname()
  // The title is the label of the menu item for the current page.
  const item = findMenuItem(pathname)

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 h-4 data-vertical:self-auto"
        />
        {item && <h1 className="text-base font-medium">{t(item.label)}</h1>}
      </div>
    </header>
  )
}
