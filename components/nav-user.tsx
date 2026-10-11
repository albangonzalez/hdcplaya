"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"
import { toast } from "sonner"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { setLocale } from "@/i18n/actions"
import { locales } from "@/i18n/config"
import { createClient } from "@/lib/supabase/client"
import { EllipsisVerticalIcon, LanguagesIcon, LogOutIcon } from "lucide-react"

export type NavUserProps = {
  user: {
    name: string
    email: string
  }
}

function getInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean)
  return words
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("")
}

export function NavUser({ user }: NavUserProps) {
  const { isMobile } = useSidebar()
  const initials = getInitials(user.name)
  const t = useTranslations("UserMenu")
  const tLocale = useTranslations("LocaleSwitcher")
  const locale = useLocale()
  const nextLocale = locales.find((candidate) => candidate !== locale) ?? locale
  const [, startTransition] = useTransition()
  const router = useRouter()

  const handleLogOut = async () => {
    const supabase = createClient()
    const { error } = await supabase.auth.signOut()

    if (error) {
      toast.error(t("logOutFailed"))
      return
    }

    router.push("/login")
    router.refresh()
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton size="lg" className="aria-expanded:bg-muted" />
            }
          >
            <Avatar className="size-8 rounded-lg grayscale">
              <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{user.name}</span>
              <span className="truncate text-xs text-foreground/70">
                {user.email}
              </span>
            </div>
            <EllipsisVerticalIcon className="ml-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-56"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="size-8">
                          <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{user.name}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {user.email}
                    </span>
                  </div>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                onClick={() => startTransition(() => setLocale(nextLocale))}
              >
                <LanguagesIcon />
                {tLocale(nextLocale)}
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogOut}>
              <LogOutIcon
              />
              {t("logOut")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
