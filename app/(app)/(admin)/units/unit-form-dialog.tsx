"use client"

import { useState, useTransition } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { OwnerOption, UnitRow } from "@/lib/data/units"
import { updateUnit } from "./actions"

// Same as OWNERSHIP_SHARE_TOTAL in models/unit.ts, which pulls in the MongoDB
// driver and so cannot be imported here.
const OWNERSHIP_SHARE_TOTAL = 10_000

type UnitFormDialogProps = {
  unit: UnitRow
  ownerOptions: OwnerOption[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UnitFormDialog({
  unit,
  ownerOptions,
  open,
  onOpenChange,
}: UnitFormDialogProps) {
  const t = useTranslations("Units.form")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("editTitle")}</DialogTitle>
          <DialogDescription>
            {t("editDescription", { identifier: unit.identifier })}
          </DialogDescription>
        </DialogHeader>
        {/* Mounted with the dialog, so the fields start fresh on every open. */}
        <UnitForm
          unit={unit}
          ownerOptions={ownerOptions}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}

function UnitForm({
  unit,
  ownerOptions,
  onDone,
}: {
  unit: UnitRow
  ownerOptions: OwnerOption[]
  onDone: () => void
}) {
  const t = useTranslations("Units.form")
  // The values the form opened with. After a save the row refreshes while the
  // dialog is still closing, and the fields' defaults must not change then.
  const [initial] = useState(unit)
  const [ownerIds, setOwnerIds] = useState(() =>
    initial.owners.map((owner) => owner.id)
  )

  // A current owner stays selectable even if their account no longer
  // qualifies (deactivated, or no longer an owner).
  const owners = [
    ...ownerOptions,
    ...initial.owners.filter(
      (owner) => !ownerOptions.some((option) => option.id === owner.id)
    ),
  ].map((owner) => ({ value: owner.id, label: owner.fullName }))

  const [isPending, startTransition] = useTransition()

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)
    const identifier = String(formData.get("identifier") ?? "").trim()
    const ownershipShare = Number(formData.get("ownershipShare"))

    startTransition(async () => {
      const result = await updateUnit(unit.id, {
        identifier,
        ownershipShare,
        ownerIds,
      })

      if (result.ok) {
        toast.success(t("saved", { identifier }))
        onDone()
      } else {
        toast.error(t(`errors.${result.error}`))
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <FieldGroup className="gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="unit-identifier">{t("identifier")}</FieldLabel>
            <Input
              id="unit-identifier"
              name="identifier"
              defaultValue={initial.identifier}
              autoComplete="off"
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="unit-ownership-share">
              {t("ownershipShare")}
            </FieldLabel>
            <Input
              id="unit-ownership-share"
              name="ownershipShare"
              type="number"
              min={0}
              max={OWNERSHIP_SHARE_TOTAL}
              step={1}
              defaultValue={initial.ownershipShare}
              autoComplete="off"
              required
            />
            <FieldDescription>
              {t("ownershipShareDescription", {
                total: OWNERSHIP_SHARE_TOTAL,
              })}
            </FieldDescription>
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="unit-owners">{t("owners")}</FieldLabel>
          <Select
            multiple
            items={owners}
            value={ownerIds}
            onValueChange={setOwnerIds}
            disabled={owners.length === 0}
          >
            <SelectTrigger id="unit-owners" className="w-full">
              <SelectValue placeholder={t("ownersPlaceholder")} />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              {owners.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldDescription>
            {owners.length === 0
              ? t("noOwnersAvailable")
              : t("ownersDescription")}
          </FieldDescription>
        </Field>
      </FieldGroup>
      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>
          {t("cancel")}
        </DialogClose>
        <Button type="submit" disabled={isPending}>
          {t("save")}
        </Button>
      </DialogFooter>
    </form>
  )
}
