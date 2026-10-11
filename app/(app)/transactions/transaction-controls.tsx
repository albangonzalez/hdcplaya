"use client"

import { useState, useTransition } from "react"
import { PlusIcon } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { toast } from "sonner"

import { ReasonDialog } from "@/components/reason-dialog"
import { RowActions } from "@/components/row-actions"
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
import type { LedgerOptions, TransactionRow } from "@/lib/data/ledger"
import { cancelTransaction, saveTransaction } from "./actions"

export function AddTransactionButton({ options }: { options: LedgerOptions }) {
  const t = useTranslations("Transactions")
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <PlusIcon />
        {t("add")}
      </Button>
      <TransactionDialog options={options} open={open} onOpenChange={setOpen} />
    </>
  )
}

export function TransactionRowActions({
  transaction,
  options,
  summary,
}: {
  transaction: TransactionRow
  options: LedgerOptions
  // The transaction in words, shown before cancelling it.
  summary: string
}) {
  const t = useTranslations("Transactions")
  const [editOpen, setEditOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleCancel(reason: string) {
    startTransition(async () => {
      const result = await cancelTransaction({
        transactionId: transaction.id,
        reason,
      })

      if (result.ok) {
        toast.success(t("cancel.done"))
        setCancelOpen(false)
      } else {
        toast.error(t(`errors.${result.error}`))
      }
    })
  }

  return (
    <>
      <RowActions
        label={t("actions.openMenu")}
        actions={[
          {
            label: t("actions.edit"),
            disabled: !transaction.editable,
            onClick: () => setEditOpen(true),
          },
          {
            label: t("actions.cancel"),
            variant: "destructive",
            disabled: !transaction.editable,
            onClick: () => setCancelOpen(true),
          },
        ]}
      />
      <TransactionDialog
        transaction={transaction}
        options={options}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <ReasonDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title={t("cancel.title")}
        summary={summary}
        reasonLabel={t("cancel.reason")}
        hint={t("cancel.description")}
        keepLabel={t("cancel.keep")}
        submitLabel={t("cancel.submit")}
        pending={isPending}
        onSubmit={handleCancel}
      />
    </>
  )
}

function TransactionDialog({
  transaction,
  options,
  open,
  onOpenChange,
}: {
  // Without a transaction the dialog adds one; with one it edits it.
  transaction?: TransactionRow
  options: LedgerOptions
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const t = useTranslations("Transactions.form")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {transaction ? t("editTitle") : t("createTitle")}
          </DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        {/* Mounted with the dialog, so the fields start fresh on every open. */}
        <TransactionForm
          transaction={transaction}
          options={options}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}

function TransactionForm({
  onDone,
  ...props
}: {
  transaction?: TransactionRow
  options: LedgerOptions
  onDone: () => void
}) {
  const t = useTranslations("Transactions")
  const locale = useLocale()
  // The values the form opened with: the page refreshes after a save while
  // the dialog is still closing, and the form must not change then.
  const [{ transaction, options }] = useState(props)
  const [type, setType] = useState<TransactionRow["type"]>(
    transaction?.type ?? "expense"
  )
  const [accountId, setAccountId] = useState(transaction?.accountId ?? null)
  const [toAccountId, setToAccountId] = useState(
    transaction?.toAccountId ?? null
  )
  const [categoryId, setCategoryId] = useState(transaction?.categoryId ?? null)
  const [isPending, startTransition] = useTransition()

  const types = (["expense", "income", "transfer"] as const).map((value) => ({
    value,
    label: t(`types.${value}`),
  }))
  // An account or category that was deactivated since stays selectable on
  // the transaction that already uses it.
  const accounts = [
    ...options.accounts,
    ...(transaction
      ? [
          { id: transaction.accountId, name: transaction.account },
          ...(transaction.toAccountId
            ? [{ id: transaction.toAccountId, name: transaction.toAccount ?? "" }]
            : []),
        ].filter(
          (used) => !options.accounts.some((account) => account.id === used.id)
        )
      : []),
  ].map((account) => ({ value: account.id, label: account.name }))
  const categories = options.categories
    .filter((category) => category.kind === type)
    .map((category) => ({ value: category.id, label: category.name[locale] }))
  if (
    transaction?.categoryId &&
    transaction.category &&
    !categories.some((category) => category.value === transaction.categoryId)
  ) {
    categories.push({
      value: transaction.categoryId,
      label: transaction.category[locale],
    })
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const isTransfer = type === "transfer"
    if (!accountId || (isTransfer ? !toAccountId : !categoryId)) {
      toast.error(t("errors.invalid"))
      return
    }

    startTransition(async () => {
      const result = await saveTransaction(transaction?.id ?? null, {
        type,
        date: String(formData.get("date")),
        amount: Math.round(Number(formData.get("amount")) * 100),
        description: String(formData.get("description") ?? ""),
        accountId,
        toAccountId: isTransfer ? toAccountId : null,
        categoryId: isTransfer ? null : categoryId,
      })

      if (result.ok) {
        toast.success(t("form.saved"))
        onDone()
      } else {
        toast.error(t(`errors.${result.error}`))
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <FieldGroup className="gap-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field>
            <FieldLabel htmlFor="transaction-type">{t("form.type")}</FieldLabel>
            <Select
              items={types}
              value={type}
              onValueChange={(value) => {
                if (!value) return
                setType(value)
                // Categories belong to one kind.
                setCategoryId(null)
              }}
              // A saved transaction keeps its type.
              disabled={Boolean(transaction)}
            >
              <SelectTrigger id="transaction-type" className="w-full">
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
          <Field>
            <FieldLabel htmlFor="transaction-date">{t("form.date")}</FieldLabel>
            <Input
              id="transaction-date"
              name="date"
              type="date"
              max={options.today}
              defaultValue={transaction?.date.slice(0, 10) ?? options.today}
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="transaction-amount">
              {t("form.amount")}
            </FieldLabel>
            <Input
              id="transaction-amount"
              name="amount"
              type="number"
              min={0.01}
              step={0.01}
              defaultValue={transaction ? transaction.amount / 100 : undefined}
              autoComplete="off"
              required
            />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="transaction-account">
              {type === "transfer" ? t("form.fromAccount") : t("form.account")}
            </FieldLabel>
            <Select items={accounts} value={accountId} onValueChange={setAccountId}>
              <SelectTrigger id="transaction-account" className="w-full">
                <SelectValue placeholder={t("form.choose")} />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          {type === "transfer" ? (
            <Field>
              <FieldLabel htmlFor="transaction-to-account">
                {t("form.toAccount")}
              </FieldLabel>
              <Select
                items={accounts}
                value={toAccountId}
                onValueChange={setToAccountId}
              >
                <SelectTrigger id="transaction-to-account" className="w-full">
                  <SelectValue placeholder={t("form.choose")} />
                </SelectTrigger>
                <SelectContent>
                  {accounts
                    .filter((item) => item.value !== accountId)
                    .map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </Field>
          ) : (
            <Field>
              <FieldLabel htmlFor="transaction-category">
                {t("form.category")}
              </FieldLabel>
              <Select
                items={categories}
                value={categoryId}
                onValueChange={setCategoryId}
              >
                <SelectTrigger id="transaction-category" className="w-full">
                  <SelectValue placeholder={t("form.choose")} />
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  {categories.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
        </div>
        <Field>
          <FieldLabel htmlFor="transaction-description">
            {t("form.descriptionLabel")}
          </FieldLabel>
          <Input
            id="transaction-description"
            name="description"
            defaultValue={transaction?.description}
            autoComplete="off"
            required
          />
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
