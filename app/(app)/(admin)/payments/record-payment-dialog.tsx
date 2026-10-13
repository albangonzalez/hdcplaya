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
import { formatMoney } from "@/lib/format"
import type { PaymentFormData, PaymentUnit } from "@/lib/data/payments"
import { periodDate } from "@/lib/fees"
import { distributePayment } from "@/lib/payments"
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
        <DialogContent className="sm:max-w-2xl">
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

// Centavos from what is typed in an amount field; 0 for anything else.
function toCentavos(value: string): number {
  const centavos = Math.round(Number(value) * 100)
  return centavos > 0 ? centavos : 0
}

const toPesos = (centavos: number | undefined) =>
  centavos ? (centavos / 100).toFixed(2) : ""

// How the payment is spread: centavos by charge id and, for credit, by unit id.
type Lines = ReturnType<typeof distributePayment>

function RecordPaymentForm({
  onDone,
  ...props
}: PaymentFormData & { onDone: () => void }) {
  const t = useTranslations("Payments")
  const format = useFormat()
  // The values the form opened with: the page refreshes after a save while
  // the dialog is still closing, and the form must not change then.
  const [{ units, owners, accounts, today }] = useState(props)
  const [ownerId, setOwnerId] = useState<string | null>(null)
  const [unitIds, setUnitIds] = useState<string[]>([])
  const [method, setMethod] = useState<"wire" | "cash">("wire")
  const [accountId, setAccountId] = useState<string | null>(
    accounts.length === 1 ? accounts[0].id : null
  )
  // Centavos; 0 until a valid amount is typed.
  const [amount, setAmount] = useState(0)
  // The lines once the admin has changed one; until then they follow the
  // amount and the units. `key` is the one the fields had at that moment, so
  // they are not remounted under the cursor.
  const [manual, setManual] = useState<(Lines & { key: string }) | null>(null)
  // How many times the lines went back to being spread automatically.
  const [resets, setResets] = useState(0)
  const [isPending, startTransition] = useTransition()

  const ownerItems = owners.map((owner) => ({
    value: owner.id,
    label: owner.fullName,
  }))
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

  // In the list's order, whatever order they were picked in.
  const selected = units.filter((unit) => unitIds.includes(unit.id))
  const automaticKey = `${amount}:${resets}`
  const lines = manual ?? distributePayment(selected, amount)
  const linesKey = manual?.key ?? automaticKey

  const parts = selected.map((unit) => {
    const allocations = unit.charges
      .map((charge) => ({
        chargeId: charge.id,
        amount: lines.allocations[charge.id] ?? 0,
        remaining: charge.remaining,
      }))
      .filter((allocation) => allocation.amount > 0)
    const credit = lines.credits[unit.id] ?? 0
    return {
      unit,
      allocations,
      credit,
      total: credit + allocations.reduce((sum, { amount }) => sum + amount, 0),
      tooMuch: allocations.some(({ amount, remaining }) => amount > remaining),
      // Credit is only for a unit whose charges are all covered.
      creditRefused:
        credit > 0 &&
        unit.charges.some(
          (charge) => (lines.allocations[charge.id] ?? 0) < charge.remaining
        ),
    }
  })
  const assigned = parts.reduce((sum, part) => sum + part.total, 0)
  const left = amount - assigned
  const canSubmit =
    amount > 0 &&
    left === 0 &&
    accountId !== null &&
    parts.every((part) => !part.tooMuch && !part.creditRefused)

  function distribute() {
    setManual(null)
    setResets(resets + 1)
  }

  function selectUnits(ids: string[]) {
    setUnitIds(ids)
    distribute()
  }

  function setLine(kind: "allocations" | "credits", id: string, value: string) {
    setManual({
      ...lines,
      key: linesKey,
      [kind]: { ...lines[kind], [id]: toCentavos(value) },
    })
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSubmit) {
      toast.error(t("form.errors.invalid"))
      return
    }
    const data = new FormData(event.currentTarget)
    const paid = parts.filter((part) => part.total > 0)

    startTransition(async () => {
      const result = await recordPayment({
        amount,
        date: String(data.get("date")),
        method,
        accountId,
        reference: String(data.get("reference")).trim() || null,
        units: paid.map((part) => ({
          unitId: part.unit.id,
          allocations: part.allocations.map(({ chargeId, amount }) => ({
            chargeId,
            amount,
          })),
          credit: part.credit,
        })),
      })

      if (result.ok) {
        toast.success(
          t("form.recorded", {
            count: paid.length,
            units: paid.map((part) => part.unit.identifier).join(", "),
          })
        )
        onDone()
      } else {
        toast.error(t(`form.errors.${result.error}`))
      }
    })
  }

  if (accounts.length === 0) {
    return <p className="text-sm text-destructive">{t("form.noAccounts")}</p>
  }

  const money = (centavos: number) => formatMoney(format, centavos)

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <FieldGroup className="gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="payment-owner">{t("form.owner")}</FieldLabel>
            <Select
              items={ownerItems}
              value={ownerId}
              onValueChange={(value) => {
                setOwnerId(value)
                selectUnits(
                  owners.find((owner) => owner.id === value)?.unitIds ?? []
                )
              }}
              disabled={owners.length === 0}
            >
              <SelectTrigger id="payment-owner" className="w-full">
                <SelectValue placeholder={t("form.ownerPlaceholder")} />
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                {ownerItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldDescription>{t("form.ownerDescription")}</FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="payment-units">{t("form.units")}</FieldLabel>
            <Select
              multiple
              items={unitItems}
              value={unitIds}
              onValueChange={(value) => {
                setOwnerId(null)
                selectUnits(value)
              }}
            >
              <SelectTrigger id="payment-units" className="w-full">
                <SelectValue placeholder={t("form.unitsPlaceholder")} />
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
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field>
            <FieldLabel htmlFor="payment-amount">{t("form.amount")}</FieldLabel>
            <Input
              id="payment-amount"
              name="amount"
              type="number"
              min={0.01}
              step={0.01}
              onChange={(event) => setAmount(toCentavos(event.target.value))}
              autoComplete="off"
              required
            />
          </Field>
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
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
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
          <Field>
            <FieldLabel htmlFor="payment-reference">
              {t("form.reference")}
            </FieldLabel>
            <Input
              id="payment-reference"
              name="reference"
              autoComplete="off"
            />
            <FieldDescription>
              {t("form.referenceDescription")}
            </FieldDescription>
          </Field>
        </div>
        {selected.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("preview.chooseUnits")}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="max-h-72 overflow-y-auto rounded-md border text-sm">
              {parts.map((part) => (
                <UnitLines
                  key={part.unit.id}
                  unit={part.unit}
                  lines={lines}
                  linesKey={linesKey}
                  creditRefused={part.creditRefused}
                  onChange={setLine}
                />
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="tabular-nums">
                {t("preview.assigned", { amount: money(assigned) })}
                {left !== 0 && (
                  <span className="text-destructive">
                    {" · "}
                    {left > 0
                      ? t("preview.left", { amount: money(left) })
                      : t("preview.over", { amount: money(-left) })}
                  </span>
                )}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={manual === null}
                onClick={distribute}
              >
                {t("preview.distribute")}
              </Button>
            </div>
          </div>
        )}
      </FieldGroup>
      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>
          {t("form.cancel")}
        </DialogClose>
        <Button type="submit" disabled={isPending || !canSubmit}>
          {t("form.submit")}
        </Button>
      </DialogFooter>
    </form>
  )
}

// One unit's unpaid charges, oldest first, each with the part of the payment
// that goes to it, and what the unit keeps as credit.
function UnitLines({
  unit,
  lines,
  linesKey,
  creditRefused,
  onChange,
}: {
  unit: PaymentUnit
  lines: Lines
  // Changes when the lines are spread again, so the fields show the new
  // amounts; typing in one does not change it.
  linesKey: string
  creditRefused: boolean
  onChange: (kind: "allocations" | "credits", id: string, value: string) => void
}) {
  const t = useTranslations("Payments.preview")
  const format = useFormat()
  const money = (centavos: number) => formatMoney(format, centavos)

  const owed = (kind: "regular" | "special") =>
    unit.charges
      .filter((charge) => charge.kind === kind)
      .reduce((sum, charge) => sum + charge.remaining, 0)

  return (
    <div className="border-t first:border-t-0">
      <div className="flex flex-wrap justify-between gap-x-4 bg-muted px-3 py-2">
        <span className="font-medium">{unit.identifier}</span>
        <span className="text-muted-foreground">
          {t("regularOwed")}{" "}
          <span className="tabular-nums">{money(owed("regular"))}</span>
          {" · "}
          {t("specialOwed")}{" "}
          <span className="tabular-nums">{money(owed("special"))}</span>
        </span>
      </div>
      {unit.charges.length === 0 && (
        <p className="border-t px-3 py-1.5 text-muted-foreground">
          {t("nothingOwed")}
        </p>
      )}
      {unit.charges.map((charge) => {
        const label = charge.period
          ? format.dateTime(periodDate(charge.period), {
              month: "long",
              year: "numeric",
              timeZone: "UTC",
            })
          : charge.description
        return (
          <div
            key={charge.id}
            className="flex items-center justify-between gap-3 border-t px-3 py-1.5"
          >
            <label htmlFor={`payment-charge-${charge.id}`}>
              {label}{" "}
              <span className="text-muted-foreground tabular-nums">
                ({t("owes", { amount: money(charge.remaining) })})
              </span>
            </label>
            <Input
              key={linesKey}
              id={`payment-charge-${charge.id}`}
              type="number"
              min={0}
              max={charge.remaining / 100}
              step={0.01}
              defaultValue={toPesos(lines.allocations[charge.id])}
              onChange={(event) =>
                onChange("allocations", charge.id, event.target.value)
              }
              autoComplete="off"
              className="h-8 w-32 text-right tabular-nums"
            />
          </div>
        )
      })}
      <div className="flex items-center justify-between gap-3 border-t px-3 py-1.5">
        <label htmlFor={`payment-credit-${unit.id}`}>
          {t("credit")}
          {creditRefused && (
            <span className="block text-xs text-destructive">
              {t("creditHint")}
            </span>
          )}
        </label>
        <Input
          key={linesKey}
          id={`payment-credit-${unit.id}`}
          type="number"
          min={0}
          step={0.01}
          defaultValue={toPesos(lines.credits[unit.id])}
          onChange={(event) => onChange("credits", unit.id, event.target.value)}
          autoComplete="off"
          aria-invalid={creditRefused}
          className="h-8 w-32 text-right tabular-nums"
        />
      </div>
    </div>
  )
}
