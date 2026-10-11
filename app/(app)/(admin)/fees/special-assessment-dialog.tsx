"use client"

import { useState, useTransition } from "react"
import { PlusIcon } from "lucide-react"
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
import type { FeeUnit } from "@/lib/data/fees"
import { createSpecialAssessment } from "./actions"
import { ChargePreview } from "./charge-preview"

type SpecialAssessmentDialogProps = {
  units: FeeUnit[]
  // Whether the units' ownership shares cover the whole condo.
  sharesAddUp: boolean
}

export function SpecialAssessmentDialog(props: SpecialAssessmentDialogProps) {
  const t = useTranslations("Fees.special")
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <PlusIcon />
        {t("add")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("form.title")}</DialogTitle>
            <DialogDescription>{t("form.description")}</DialogDescription>
          </DialogHeader>
          {/* Mounted with the dialog, so the fields start fresh on every open. */}
          <SpecialAssessmentForm {...props} onDone={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  )
}

function SpecialAssessmentForm({
  units,
  sharesAddUp,
  onDone,
}: SpecialAssessmentDialogProps & { onDone: () => void }) {
  const t = useTranslations("Fees")
  // Centavos; 0 until a valid amount is typed.
  const [total, setTotal] = useState(0)
  const [isPending, startTransition] = useTransition()

  const problem =
    units.length === 0
      ? t("errors.noUnits")
      : !sharesAddUp
        ? t("errors.sharesMismatch")
        : null

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const description = String(formData.get("description") ?? "").trim()

    startTransition(async () => {
      const result = await createSpecialAssessment({
        description,
        total,
        dueDate: String(formData.get("dueDate")),
      })

      if (result.ok) {
        toast.success(t("special.form.created", { description }))
        onDone()
      } else {
        toast.error(
          result.error === "noUnits" || result.error === "sharesMismatch"
            ? t(`errors.${result.error}`)
            : t(`special.form.errors.${result.error}`)
        )
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <FieldGroup className="gap-4">
        <Field>
          <FieldLabel htmlFor="assessment-description">
            {t("special.form.descriptionLabel")}
          </FieldLabel>
          <Input
            id="assessment-description"
            name="description"
            autoComplete="off"
            required
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="assessment-total">
              {t("special.form.total")}
            </FieldLabel>
            <Input
              id="assessment-total"
              name="total"
              type="number"
              min={0.01}
              step={0.01}
              onChange={(event) => {
                const centavos = Math.round(Number(event.target.value) * 100)
                setTotal(centavos > 0 ? centavos : 0)
              }}
              autoComplete="off"
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="assessment-due-date">
              {t("special.form.dueDate")}
            </FieldLabel>
            <Input
              id="assessment-due-date"
              name="dueDate"
              type="date"
              required
            />
          </Field>
        </div>
        {problem ? (
          <p className="text-sm text-destructive">{problem}</p>
        ) : (
          total > 0 && <ChargePreview units={units} total={total} />
        )}
      </FieldGroup>
      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>
          {t("cancel")}
        </DialogClose>
        <Button type="submit" disabled={isPending || problem !== null}>
          {t("special.form.submit")}
        </Button>
      </DialogFooter>
    </form>
  )
}
