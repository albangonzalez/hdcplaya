"use client"

import { useState, useTransition } from "react"
import { PlusIcon } from "lucide-react"
import { useFormatter, useTranslations } from "next-intl"
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
import type { FeeSettingRow, FeeUnit } from "@/lib/data/fees"
import { findFeeSetting, periodDate } from "@/lib/fees"
import { generateFees } from "./actions"
import { ChargePreview } from "./charge-preview"

const PERIOD_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/

type GenerateFeesDialogProps = {
  settings: FeeSettingRow[]
  units: FeeUnit[]
  // Whether the units' ownership shares cover the whole condo.
  sharesAddUp: boolean
  generatedPeriods: string[]
  // The month proposed: the one after the last generated.
  defaultPeriod: string
}

export function GenerateFeesDialog(props: GenerateFeesDialogProps) {
  const t = useTranslations("Fees.monthly")
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <PlusIcon />
        {t("generate")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("form.title")}</DialogTitle>
            <DialogDescription>{t("form.description")}</DialogDescription>
          </DialogHeader>
          {/* Mounted with the dialog, so the fields start fresh on every open. */}
          <GenerateFeesForm {...props} onDone={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  )
}

function GenerateFeesForm({
  onDone,
  ...props
}: GenerateFeesDialogProps & { onDone: () => void }) {
  const t = useTranslations("Fees")
  const format = useFormatter()
  // The values the form opened with: the section refreshes after generating
  // while the dialog is still closing, and the form must not change then.
  const [{ settings, units, sharesAddUp, generatedPeriods, defaultPeriod }] =
    useState(props)
  const [period, setPeriod] = useState(defaultPeriod)
  const [isPending, startTransition] = useTransition()

  const setting = PERIOD_PATTERN.test(period)
    ? findFeeSetting(settings, period)
    : undefined
  const problem =
    units.length === 0
      ? t("errors.noUnits")
      : !sharesAddUp
        ? t("errors.sharesMismatch")
        : !setting
          ? t("monthly.form.errors.noSettings")
          : null

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    startTransition(async () => {
      const result = await generateFees(period)

      if (!result.ok) {
        toast.error(
          result.error === "noUnits" || result.error === "sharesMismatch"
            ? t(`errors.${result.error}`)
            : t(`monthly.form.errors.${result.error}`)
        )
        return
      }

      if (result.created === 0) {
        toast.info(t("monthly.form.nothingToGenerate"))
      } else {
        toast.success(t("monthly.form.generated", { count: result.created }))
      }
      onDone()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <FieldGroup className="gap-4">
        <Field>
          <FieldLabel htmlFor="fees-period">
            {t("monthly.form.period")}
          </FieldLabel>
          <Input
            id="fees-period"
            name="period"
            type="month"
            pattern="\d{4}-(0[1-9]|1[0-2])"
            placeholder={t("monthPlaceholder")}
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
            required
          />
          {setting && !problem && (
            <FieldDescription>
              {t("monthly.form.summary", {
                budget: format.number(setting.monthlyBudget / 100, {
                  style: "currency",
                  currency: "MXN",
                }),
                dueDate: format.dateTime(periodDate(period, setting.dueDay), {
                  dateStyle: "long",
                  timeZone: "UTC",
                }),
              })}
            </FieldDescription>
          )}
        </Field>
        {problem ? (
          <p className="text-sm text-destructive">{problem}</p>
        ) : (
          setting && (
            <>
              {generatedPeriods.includes(period) && (
                <p className="text-sm text-muted-foreground">
                  {t("monthly.form.alreadyGenerated")}
                </p>
              )}
              <ChargePreview units={units} total={setting.monthlyBudget} />
            </>
          )
        )}
      </FieldGroup>
      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>
          {t("cancel")}
        </DialogClose>
        <Button type="submit" disabled={isPending || problem !== null}>
          {t("monthly.form.submit")}
        </Button>
      </DialogFooter>
    </form>
  )
}
