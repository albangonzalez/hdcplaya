"use client"

import { useState, useTransition } from "react"
import { useTranslations } from "next-intl"
import { EllipsisVerticalIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { UserRow } from "@/lib/data/users"
import { setUserActive } from "./actions"
import { UserFormDialog } from "./user-form-dialog"

export function UserRowActions({ user }: { user: UserRow }) {
  const t = useTranslations("Users")
  const [editOpen, setEditOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const deactivated = user.status === "deactivated"

  function handleStatus() {
    startTransition(async () => {
      const result = await setUserActive(user.id, deactivated)

      if (result.ok) {
        toast.success(
          t(deactivated ? "reactivated" : "deactivated", {
            name: user.fullName,
          })
        )
      } else {
        toast.error(t(`form.errors.${result.error}`))
      }
    })
  }

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
          <span className="sr-only">{t("actions.openMenu")}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-36">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            {t("actions.edit")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant={deactivated ? "default" : "destructive"}
            disabled={isPending}
            onClick={handleStatus}
          >
            {t(deactivated ? "actions.reactivate" : "actions.deactivate")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <UserFormDialog user={user} open={editOpen} onOpenChange={setEditOpen} />
    </>
  )
}
