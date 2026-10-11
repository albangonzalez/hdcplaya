"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { PlusIcon } from "lucide-react"
import { useTranslations } from "next-intl"

import { RowActions } from "@/components/row-actions"
import { Button } from "@/components/ui/button"
import type { OwnerOption, UnitRow } from "@/lib/data/units"
import { UnitFormDialog } from "./unit-form-dialog"

type FormProps = {
  ownerOptions: OwnerOption[]
  // Today's date where the condo is, "YYYY-MM-DD".
  today: string
}

export function AddUnitButton(props: FormProps) {
  const t = useTranslations("Units")
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <PlusIcon />
        {t("add")}
      </Button>
      <UnitFormDialog {...props} open={open} onOpenChange={setOpen} />
    </>
  )
}

export function UnitRowActions({
  unit,
  ...props
}: FormProps & { unit: UnitRow }) {
  const t = useTranslations("Units.actions")
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)

  return (
    <>
      <RowActions
        label={t("openMenu")}
        actions={[
          {
            label: t("view"),
            onClick: () => router.push(`/units/${unit.id}`),
          },
          { label: t("edit"), onClick: () => setEditOpen(true) },
        ]}
      />
      <UnitFormDialog
        unit={unit}
        {...props}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  )
}
