"use client"

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
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

// Asks for the reason before something is cancelled: nothing is cancelled
// silently.
export function ReasonDialog({
  open,
  onOpenChange,
  title,
  summary,
  reasonLabel,
  hint,
  keepLabel,
  submitLabel,
  pending,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  // What is being cancelled, in words.
  summary: string
  reasonLabel: string
  hint: string
  keepLabel: string
  submitLabel: string
  pending: boolean
  onSubmit: (reason: string) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{summary}</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault()
            onSubmit(String(new FormData(event.currentTarget).get("reason")))
          }}
          className="flex flex-col gap-6"
        >
          <Field>
            <FieldLabel htmlFor="cancel-reason">{reasonLabel}</FieldLabel>
            <Input id="cancel-reason" name="reason" autoComplete="off" required />
            <FieldDescription>{hint}</FieldDescription>
          </Field>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              {keepLabel}
            </DialogClose>
            <Button type="submit" variant="destructive" disabled={pending}>
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
