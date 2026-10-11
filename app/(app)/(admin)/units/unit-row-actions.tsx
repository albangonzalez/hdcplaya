"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { EllipsisVerticalIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { OwnerOption, UnitRow } from "@/lib/data/units"
import { UnitFormDialog } from "./unit-form-dialog"

export function UnitRowActions({
  unit,
  ownerOptions,
}: {
  unit: UnitRow
  ownerOptions: OwnerOption[]
}) {
  const t = useTranslations("Units.actions")
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
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            {t("edit")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <UnitFormDialog
        unit={unit}
        ownerOptions={ownerOptions}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  )
}
