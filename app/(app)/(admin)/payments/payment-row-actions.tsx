"use client"

import { useState, useTransition } from "react"
import { useTranslations } from "next-intl"
import { EllipsisVerticalIcon } from "lucide-react"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import type { PaymentRow } from "@/lib/data/payments"
import { cancelPayment } from "./actions"

export function PaymentRowActions({
  payment,
  summary,
}: {
  payment: PaymentRow
  // The payment in words, e.g. "$1,869.12 from A-1 on 10 Oct 2026".
  summary: string
}) {
  const t = useTranslations("Payments")
  const [cancelOpen, setCancelOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const reason = String(new FormData(event.currentTarget).get("reason"))

    startTransition(async () => {
      const result = await cancelPayment({ paymentId: payment.id, reason })

      if (result.ok) {
        toast.success(t("cancel.done"))
        setCancelOpen(false)
      } else {
        toast.error(t(`cancel.errors.${result.error}`))
      }
    })
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              className="flex size-8 text-muted-foreground data-open:bg-muted"
              size="icon"
            />
          }
        >
          <EllipsisVerticalIcon />
          <span className="sr-only">{t("actions.openMenu")}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem
            variant="destructive"
            disabled={!payment.canCancel}
            onClick={() => setCancelOpen(true)}
          >
            {t("actions.cancel")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("cancel.title")}</DialogTitle>
            <DialogDescription>{summary}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <Field>
              <FieldLabel htmlFor={`cancel-reason-${payment.id}`}>
                {t("cancel.reason")}
              </FieldLabel>
              <Input
                id={`cancel-reason-${payment.id}`}
                name="reason"
                autoComplete="off"
                required
              />
              <FieldDescription>{t("cancel.description")}</FieldDescription>
            </Field>
            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" />}>
                {t("cancel.keep")}
              </DialogClose>
              <Button type="submit" variant="destructive" disabled={isPending}>
                {t("cancel.submit")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
