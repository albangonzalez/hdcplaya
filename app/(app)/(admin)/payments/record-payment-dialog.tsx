"use client"

import { useState, useTransition } from "react"
import { PlusIcon } from "lucide-react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"

import { useFormat } from "@/hooks/use-format"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatMoney } from "@/lib/format"
import type { PaymentFormData, PaymentUnit } from "@/lib/data/payments"
import { periodDate } from "@/lib/fees"
import { allocateOldestFirst } from "@/lib/payments"
import { recordPayment } from "./actions"

export function RecordPaymentDialog(props: PaymentFormData) {
  const t = useTranslations("Payments")
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <PlusIcon />
        {t("record")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("form.title")}</DialogTitle>
            <DialogDescription>{t("form.description")}</DialogDescription>
          </DialogHeader>
          {/* Mounted with the dialog, so the fields start fresh on every open. */}
          <RecordPaymentForm {...props} onDone={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  )
}

function RecordPaymentForm({
  onDone,
  ...props
}: PaymentFormData & { onDone: () => void }) {
  const t = useTranslations("Payments")
  // The values the form opened with: the page refreshes after a save while
  // the dialog is still closing, and the form must not change then.
  const [{ units, accounts, today }] = useState(props)
  const [unitId, setUnitId] = useState<string | null>(null)
  const [method, setMethod] = useState<"wire" | "cash">("wire")
  const [accountId, setAccountId] = useState<string | null>(
    accounts.length === 1 ? accounts[0].id : null
  )
  // Centavos; 0 until a valid amount is typed.
  const [amount, setAmount] = useState(0)
  const [isPending, startTransition] = useTransition()

  const unitItems = units.map((unit) => ({
    value: unit.id,
    label: unit.identifier,
  }))
  const methodItems = (["wire", "cash"] as const).map((value) => ({
    value,
    label: t(`methods.${value}`),
  }))
  const accountItems = accounts.map((account) => ({
    value: account.id,
    label: account.name,
  }))
  const unit = units.find((candidate) => candidate.id === unitId)

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!unit || !accountId) {
      toast.error(t("form.errors.invalid"))
      return
    }
    const date = String(new FormData(event.currentTarget).get("date"))

    startTransition(async () => {
      const result = await recordPayment({
        unitId: unit.id,
        amount,
        date,
        method,
        accountId,
      })

      if (result.ok) {
        toast.success(t("form.recorded", { unit: unit.identifier }))
        onDone()
      } else {
        toast.error(t(`form.errors.${result.error}`))
      }
    })
  }

  if (accounts.length === 0) {
    return <p className="text-sm text-destructive">{t("form.noAccounts")}</p>
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <FieldGroup className="gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="payment-unit">{t("form.unit")}</FieldLabel>
            <Select items={unitItems} value={unitId} onValueChange={setUnitId}>
              <SelectTrigger id="payment-unit" className="w-full">
                <SelectValue placeholder={t("form.unitPlaceholder")} />
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                {unitItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="payment-amount">{t("form.amount")}</FieldLabel>
            <Input
              id="payment-amount"
              name="amount"
              type="number"
              min={0.01}
              step={0.01}
              onChange={(event) => {
                const centavos = Math.round(Number(event.target.value) * 100)
                setAmount(centavos > 0 ? centavos : 0)
              }}
              autoComplete="off"
              required
            />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field>
            <FieldLabel htmlFor="payment-date">{t("form.date")}</FieldLabel>
            <Input
              id="payment-date"
              name="date"
              type="date"
              max={today}
              defaultValue={today}
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="payment-method">{t("form.method")}</FieldLabel>
            <Select
              items={methodItems}
              value={method}
              onValueChange={(value) => value && setMethod(value)}
            >
              <SelectTrigger id="payment-method" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {methodItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="payment-account">
              {t("form.account")}
            </FieldLabel>
            <Select
              items={accountItems}
              value={accountId}
              onValueChange={setAccountId}
            >
              <SelectTrigger id="payment-account" className="w-full">
                <SelectValue placeholder={t("form.accountPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {accountItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        {unit && <PaymentPreview unit={unit} amount={amount} />}
      </FieldGroup>
      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>
          {t("form.cancel")}
        </DialogClose>
        <Button
          type="submit"
          disabled={isPending || !unit || !accountId || amount === 0}
        >
          {t("form.submit")}
        </Button>
      </DialogFooter>
    </form>
  )
}

// What the unit owes, split in regular fees and special assessments, and how
// the amount typed would be applied.
function PaymentPreview({
  unit,
  amount,
}: {
  unit: PaymentUnit
  amount: number
}) {
  const t = useTranslations("Payments.preview")
  const format = useFormat()
  const money = (centavos: number) =>
    formatMoney(format, centavos)

  const owed = (kind: "regular" | "special") =>
    unit.charges
      .filter((charge) => charge.kind === kind)
      .reduce((sum, charge) => sum + charge.remaining, 0)
  const { allocations, unallocated } = allocateOldestFirst(unit.charges, amount)

  return (
    <div className="overflow-hidden rounded-md border text-sm">
      <div className="flex justify-between bg-muted px-3 py-2">
        <span>
          {t("regularOwed")}{" "}
          <span className="font-medium tabular-nums">
            {money(owed("regular"))}
          </span>
        </span>
        <span>
          {t("specialOwed")}{" "}
          <span className="font-medium tabular-nums">
            {money(owed("special"))}
          </span>
        </span>
      </div>
      {amount > 0 && (
        <div className="max-h-44 overflow-y-auto">
          {allocations.map(({ charge, amount: applied }) => (
            <div
              key={charge.id}
              className="flex justify-between border-t px-3 py-1.5"
            >
              <span>
                {charge.period
                  ? format.dateTime(periodDate(charge.period), {
                      month: "long",
                      year: "numeric",
                      timeZone: "UTC",
                    })
                  : charge.description}
                {applied < charge.remaining && (
                  <span className="text-muted-foreground">
                    {" "}
                    ({t("partial")})
                  </span>
                )}
              </span>
              <span className="tabular-nums">{money(applied)}</span>
            </div>
          ))}
          {unallocated > 0 && (
            <div className="flex justify-between border-t px-3 py-1.5">
              <span>{t("credit")}</span>
              <span className="tabular-nums">{money(unallocated)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
