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
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { addPlate, removePlate } from "./actions"

export function AddPlateButton({
  unitId,
  spaceId,
}: {
  unitId: string
  spaceId: string
}) {
  const t = useTranslations("UnitDetail.parking")
  const tErrors = useTranslations("UnitDetail.errors")
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)

    startTransition(async () => {
      const result = await addPlate(unitId, spaceId, {
        plate: String(formData.get("plate") ?? ""),
        note: String(formData.get("note") ?? "").trim() || null,
      })

      if (result.ok) {
        toast.success(t("plateAdded"))
        setOpen(false)
      } else {
        toast.error(tErrors(result.error))
      }
    })
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <PlusIcon />
        {t("addPlate")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("addPlateTitle")}</DialogTitle>
            <DialogDescription>{t("addPlateDescription")}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <FieldGroup className="gap-4">
              <Field>
                <FieldLabel htmlFor="plate-number">{t("plate")}</FieldLabel>
                <Input
                  id="plate-number"
                  name="plate"
                  className="uppercase"
                  autoComplete="off"
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="plate-note">
                  {t("note")}
                  <span className="font-normal text-muted-foreground">
                    ({t("optional")})
                  </span>
                </FieldLabel>
                <Input id="plate-note" name="note" autoComplete="off" />
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
        </DialogContent>
      </Dialog>
    </>
  )
}

export function RemovePlateButton({
  unitId,
  plateId,
  plate,
}: {
  unitId: string
  plateId: string
  plate: string
}) {
  const t = useTranslations("UnitDetail.parking")
  const tErrors = useTranslations("UnitDetail.errors")
  const [isPending, startTransition] = useTransition()

  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-7 text-muted-foreground"
      aria-label={t("removePlate", { plate })}
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const result = await removePlate(unitId, plateId)
          if (result.ok) {
            toast.success(t("plateRemoved"))
          } else {
            toast.error(tErrors(result.error))
          }
        })
      }
    >
      <XIcon />
    </Button>
  )
}
