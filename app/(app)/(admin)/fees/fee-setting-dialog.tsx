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
import type { FeeSettingValue } from "@/lib/fees"
import { saveFeeSetting } from "./actions"

type FeeSettingDialogProps = {
  // The month proposed as the start of the new settings.
  defaultPeriod: string
  // The settings in force, used as starting values.
  current?: FeeSettingValue
}

export function FeeSettingDialog(props: FeeSettingDialogProps) {
  const t = useTranslations("Fees.settings")
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        {t("change")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("form.title")}</DialogTitle>
            <DialogDescription>{t("form.description")}</DialogDescription>
          </DialogHeader>
          {/* Mounted with the dialog, so the fields start fresh on every open. */}
          <FeeSettingForm {...props} onDone={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  )
}

function FeeSettingForm({
  defaultPeriod,
  current,
  onDone,
}: FeeSettingDialogProps & { onDone: () => void }) {
  const t = useTranslations("Fees")
  // The values the form opened with: the section refreshes after a save
  // while the dialog is still closing, and the defaults must not change then.
  const [initial] = useState({ defaultPeriod, current })
  const [isPending, startTransition] = useTransition()

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)

    startTransition(async () => {
      const result = await saveFeeSetting({
        effectiveFrom: String(formData.get("effectiveFrom")),
        monthlyBudget: Math.round(Number(formData.get("monthlyBudget")) * 100),
        dueDay: Number(formData.get("dueDay")),
      })

      if (result.ok) {
        toast.success(t("settings.form.saved"))
        onDone()
      } else {
        toast.error(t(`settings.form.errors.${result.error}`))
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <FieldGroup className="gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="fee-monthly-budget">
              {t("settings.form.monthlyBudget")}
            </FieldLabel>
            <Input
              id="fee-monthly-budget"
              name="monthlyBudget"
              type="number"
              min={0}
              step={0.01}
              defaultValue={
                initial.current ? initial.current.monthlyBudget / 100 : undefined
              }
              autoComplete="off"
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="fee-due-day">
              {t("settings.form.dueDay")}
            </FieldLabel>
            <Input
              id="fee-due-day"
              name="dueDay"
              type="number"
              min={1}
              max={28}
              step={1}
              defaultValue={initial.current?.dueDay}
              autoComplete="off"
              required
            />
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="fee-effective-from">
            {t("settings.form.effectiveFrom")}
          </FieldLabel>
          <Input
            id="fee-effective-from"
            name="effectiveFrom"
            type="month"
            pattern="\d{4}-(0[1-9]|1[0-2])"
            placeholder={t("monthPlaceholder")}
            defaultValue={initial.defaultPeriod}
            required
          />
          <FieldDescription>
            {t("settings.form.effectiveFromDescription")}
          </FieldDescription>
        </Field>
      </FieldGroup>
      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>
          {t("cancel")}
        </DialogClose>
        <Button type="submit" disabled={isPending}>
          {t("settings.form.save")}
        </Button>
      </DialogFooter>
    </form>
  )
}
