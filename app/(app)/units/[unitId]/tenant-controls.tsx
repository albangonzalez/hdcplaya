"use client"

import { useState, useTransition } from "react"
import { PlusIcon } from "lucide-react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"

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
import type { UnitTenant } from "@/lib/data/unit-accounts"
import { removeTenant, saveTenant } from "./actions"

type Props = {
  unitId: string
  // Today's date where the condo is, "YYYY-MM-DD".
  today: string
}

export function AddTenantButton(props: Props) {
  const t = useTranslations("UnitDetail.tenants")
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <PlusIcon />
        {t("add")}
      </Button>
      <TenantDialog {...props} open={open} onOpenChange={setOpen} />
    </>
  )
}

export function TenantRowActions({
  tenant,
  ...props
}: Props & { tenant: UnitTenant }) {
  const t = useTranslations("UnitDetail")
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleRemove() {
    startTransition(async () => {
      const result = await removeTenant(props.unitId, tenant.id)
      if (result.ok) {
        toast.success(t("tenants.removed"))
      } else {
        toast.error(t(`errors.${result.error}`))
      }
    })
  }

  return (
    <>
      <RowActions
        label={t("openMenu")}
        actions={[
          { label: t("tenants.edit"), onClick: () => setOpen(true) },
          {
            label: t("tenants.remove"),
            variant: "destructive",
            disabled: isPending,
            onClick: handleRemove,
          },
        ]}
      />
      <TenantDialog
        {...props}
        tenant={tenant}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  )
}

function TenantDialog({
  open,
  onOpenChange,
  ...props
}: Props & {
  // Without a tenant the dialog adds one; with one it edits it.
  tenant?: UnitTenant
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const t = useTranslations("UnitDetail.tenants")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {props.tenant ? t("editTitle") : t("addTitle")}
          </DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        {/* Mounted with the dialog, so the fields start fresh on every open. */}
        <TenantForm {...props} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}

function TenantForm({
  onDone,
  ...props
}: Props & { tenant?: UnitTenant; onDone: () => void }) {
  const t = useTranslations("UnitDetail")
  // The values the form opened with: the page refreshes after a save while
  // the dialog is still closing, and the defaults must not change then.
  const [{ unitId, tenant, today }] = useState(props)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const text = (name: string) => String(formData.get(name) ?? "").trim()

    startTransition(async () => {
      const result = await saveTenant(unitId, tenant?.id ?? null, {
        firstName: text("firstName"),
        firstLastName: text("firstLastName"),
        secondLastName: text("secondLastName") || null,
        contact: text("contact"),
        from: text("from"),
        to: text("to") || null,
      })

      if (result.ok) {
        toast.success(t("tenants.saved"))
        onDone()
      } else {
        toast.error(t(`errors.${result.error}`))
      }
    })
  }

  const optional = (
    <span className="font-normal text-muted-foreground">
      ({t("tenants.optional")})
    </span>
  )

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <FieldGroup className="gap-4">
        <Field>
          <FieldLabel htmlFor="tenant-first-name">
            {t("tenants.firstName")}
          </FieldLabel>
          <Input
            id="tenant-first-name"
            name="firstName"
            defaultValue={tenant?.firstName}
            autoComplete="off"
            required
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="tenant-first-last-name">
              {t("tenants.firstLastName")}
            </FieldLabel>
            <Input
              id="tenant-first-last-name"
              name="firstLastName"
              defaultValue={tenant?.firstLastName}
              autoComplete="off"
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="tenant-second-last-name">
              {t("tenants.secondLastName")}
              {optional}
            </FieldLabel>
            <Input
              id="tenant-second-last-name"
              name="secondLastName"
              defaultValue={tenant?.secondLastName ?? ""}
              autoComplete="off"
            />
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="tenant-contact">
            {t("tenants.contactLabel")}
          </FieldLabel>
          <Input
            id="tenant-contact"
            name="contact"
            defaultValue={tenant?.contact}
            autoComplete="off"
            required
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="tenant-from">{t("tenants.from")}</FieldLabel>
            <Input
              id="tenant-from"
              name="from"
              type="date"
              defaultValue={tenant?.from.slice(0, 10) ?? today}
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="tenant-to">
              {t("tenants.to")}
              {optional}
            </FieldLabel>
            <Input
              id="tenant-to"
              name="to"
              type="date"
              defaultValue={tenant?.to?.slice(0, 10)}
            />
          </Field>
        </div>
      </FieldGroup>
      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>
          {t("tenants.cancel")}
        </DialogClose>
        <Button type="submit" disabled={isPending}>
          {t("tenants.save")}
        </Button>
      </DialogFooter>
    </form>
  )
}
