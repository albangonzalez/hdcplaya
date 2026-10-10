"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { EllipsisVerticalIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { UserRow } from "@/lib/data/users"
import { UserFormDialog } from "./user-form-dialog"

// Only "edit" is wired; the other actions are just listed.
export function UserRowActions({ user }: { user: UserRow }) {
  const t = useTranslations("Users.actions")
  const [editOpen, setEditOpen] = useState(false)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              className="flex size-8 text-muted-foreground data-open:bg-muted"
              size="icon"
            />
          }
        >
          <EllipsisVerticalIcon />
          <span className="sr-only">{t("openMenu")}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-36">
          <DropdownMenuItem>{t("show")}</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            {t("edit")}
          </DropdownMenuItem>
          <DropdownMenuItem>{t("deactivate")}</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive">{t("delete")}</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <UserFormDialog user={user} open={editOpen} onOpenChange={setEditOpen} />
    </>
  )
}
