"use client"

import { useState, useTransition } from "react"
import { PlusIcon } from "lucide-react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"

import { RowActions } from "@/components/row-actions"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
  FieldContent,
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
import type { AccountRow } from "@/lib/data/ledger"
import { saveAccount } from "./actions"

export function AddAccountButton() {
  const t = useTranslations("Accounts")
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <PlusIcon />
        {t("add")}
      </Button>
      <AccountDialog open={open} onOpenChange={setOpen} />
    </>
  )
}

export function AccountRowActions({ account }: { account: AccountRow }) {
  const t = useTranslations("Accounts.actions")
  const [open, setOpen] = useState(false)

  return (
    <>
      <RowActions
        label={t("openMenu")}
        actions={[{ label: t("edit"), onClick: () => setOpen(true) }]}
      />
      <AccountDialog account={account} open={open} onOpenChange={setOpen} />
    </>
  )
}

function AccountDialog({
  account,
  open,
  onOpenChange,
}: {
  // Without an account the dialog creates one; with one it edits it.
  account?: AccountRow
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const t = useTranslations("Accounts.form")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{account ? t("editTitle") : t("createTitle")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        {/* Mounted with the dialog, so the fields start fresh on every open. */}
        <AccountForm account={account} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}

function AccountForm({
  account: current,
  onDone,
}: {
  account?: AccountRow
  onDone: () => void
}) {
  const t = useTranslations("Accounts")
  // The values the form opened with: the row refreshes after a save while
  // the dialog is still closing, and the defaults must not change then.
  const [account] = useState(current)
  const [type, setType] = useState<AccountRow["type"]>(account?.type ?? "bank")
  const [active, setActive] = useState(account?.active ?? true)
  const [isPending, startTransition] = useTransition()

  const types = (["bank", "cash"] as const).map((value) => ({
    value,
    label: t(`types.${value}`),
  }))

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)

    startTransition(async () => {
      const result = await saveAccount(account?.id ?? null, {
        name: String(formData.get("name") ?? ""),
        type,
        openingBalance: Math.round(Number(formData.get("openingBalance")) * 100),
        openingDate: String(formData.get("openingDate")),
        active,
      })

      if (result.ok) {
        toast.success(t("form.saved"))
        onDone()
      } else {
        toast.error(t(`form.errors.${result.error}`))
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <FieldGroup className="gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="account-name">{t("form.name")}</FieldLabel>
            <Input
              id="account-name"
              name="name"
              defaultValue={account?.name}
              autoComplete="off"
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="account-type">{t("form.type")}</FieldLabel>
            <Select
              items={types}
              value={type}
              onValueChange={(value) => value && setType(value)}
            >
              <SelectTrigger id="account-type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {types.map((item) => (
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
            <FieldLabel htmlFor="account-opening-balance">
              {t("form.openingBalance")}
            </FieldLabel>
            <Input
              id="account-opening-balance"
              name="openingBalance"
              type="number"
              step={0.01}
              defaultValue={account ? account.openingBalance / 100 : 0}
              autoComplete="off"
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="account-opening-date">
              {t("form.openingDate")}
            </FieldLabel>
            <Input
              id="account-opening-date"
              name="openingDate"
              type="date"
              defaultValue={account?.openingDate.slice(0, 10)}
              required
            />
          </Field>
        </div>
        <Field orientation="horizontal">
          <Checkbox
            id="account-active"
            checked={active}
            onCheckedChange={setActive}
          />
          <FieldContent>
            <FieldLabel htmlFor="account-active">{t("form.active")}</FieldLabel>
            <FieldDescription>{t("form.activeDescription")}</FieldDescription>
          </FieldContent>
        </Field>
      </FieldGroup>
      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>
          {t("form.cancel")}
        </DialogClose>
        <Button type="submit" disabled={isPending}>
          {t("form.save")}
        </Button>
      </DialogFooter>
    </form>
  )
}
