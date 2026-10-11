"use client"

import { useState, useTransition } from "react"
import { PlusIcon, XIcon } from "lucide-react"
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
import { saveUnit } from "./actions"

// Same as OWNERSHIP_SHARE_TOTAL in models/unit.ts, which pulls in the MongoDB
// driver and so cannot be imported here.
const OWNERSHIP_SHARE_TOTAL = 10_000

type UnitFormDialogProps = {
  // Without a unit the dialog creates one; with one it edits it.
  unit?: UnitRow
  ownerOptions: OwnerOption[]
  // Today's date where the condo is, "YYYY-MM-DD".
  today: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UnitFormDialog({
  open,
  onOpenChange,
  ...props
}: UnitFormDialogProps) {
  const t = useTranslations("Units.form")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {props.unit ? t("editTitle") : t("createTitle")}
          </DialogTitle>
          <DialogDescription>
            {props.unit
              ? t("editDescription", { identifier: props.unit.identifier })
              : t("createDescription")}
          </DialogDescription>
        </DialogHeader>
        {/* Mounted with the dialog, so the fields start fresh on every open. */}
        <UnitForm {...props} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}

function UnitForm({
  onDone,
  ...props
}: Omit<UnitFormDialogProps, "open" | "onOpenChange"> & {
  onDone: () => void
}) {
  const t = useTranslations("Units.form")
  // The values the form opened with. After a save the row refreshes while the
  // dialog is still closing, and the fields' defaults must not change then.
  const [{ unit, ownerOptions, today }] = useState(props)
  const [ownerIds, setOwnerIds] = useState(
    () => unit?.owners.map((owner) => owner.id) ?? []
  )
  // `key` only tells the rows apart; `id` is set for a space already saved.
  const [spaces, setSpaces] = useState(
    () =>
      unit?.parkingSpaces.map((space) => ({
        key: space.id,
        id: space.id as string | null,
        label: space.label,
      })) ?? []
  )

  // A current owner stays selectable even if their account no longer
  // qualifies (deactivated, or no longer an owner).
  const owners = [
    ...ownerOptions,
    ...(unit?.owners ?? []).filter(
      (owner) => !ownerOptions.some((option) => option.id === owner.id)
    ),
  ].map((owner) => ({ value: owner.id, label: owner.fullName }))

  const [isPending, startTransition] = useTransition()

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)
    const identifier = String(formData.get("identifier") ?? "").trim()

    startTransition(async () => {
      const result = await saveUnit(unit?.id ?? null, {
        identifier,
        ownershipShare: Number(formData.get("ownershipShare")),
        ownerIds,
        ownersChangedOn: String(formData.get("ownersChangedOn")),
        parkingSpaces: spaces.map(({ id, label }) => ({ id, label })),
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
              defaultValue={unit?.identifier}
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
              defaultValue={unit?.ownershipShare}
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
        <div className="grid gap-4 sm:grid-cols-2">
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
            {owners.length === 0 && (
              <FieldDescription>{t("noOwnersAvailable")}</FieldDescription>
            )}
          </Field>
          <Field>
            <FieldLabel htmlFor="unit-owners-changed-on">
              {t("ownersChangedOn")}
            </FieldLabel>
            <Input
              id="unit-owners-changed-on"
              name="ownersChangedOn"
              type="date"
              max={today}
              defaultValue={today}
              required
            />
            <FieldDescription>
              {t("ownersChangedOnDescription")}
            </FieldDescription>
          </Field>
        </div>
        <Field>
          <FieldLabel>{t("parkingSpaces")}</FieldLabel>
          {spaces.map((space) => (
            <div key={space.key} className="flex gap-2">
              <Input
                aria-label={t("parkingLabel")}
                placeholder={t("parkingLabel")}
                value={space.label}
                onChange={(event) =>
                  setSpaces((current) =>
                    current.map((other) =>
                      other.key === space.key
                        ? { ...other, label: event.target.value }
                        : other
                    )
                  )
                }
                autoComplete="off"
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={t("removeParking")}
                onClick={() =>
                  setSpaces((current) =>
                    current.filter((other) => other.key !== space.key)
                  )
                }
              >
                <XIcon />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="self-start"
            onClick={() =>
              setSpaces((current) => [
                ...current,
                { key: crypto.randomUUID(), id: null, label: "" },
              ])
            }
          >
            <PlusIcon />
            {t("addParking")}
          </Button>
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
