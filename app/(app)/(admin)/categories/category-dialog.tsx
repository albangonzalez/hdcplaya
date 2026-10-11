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
import type { CategoryRow } from "@/lib/data/categories"
import { saveCategory } from "./actions"

export function AddCategoryButton() {
  const t = useTranslations("Categories")
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <PlusIcon />
        {t("add")}
      </Button>
      <CategoryDialog open={open} onOpenChange={setOpen} />
    </>
  )
}

export function CategoryRowActions({ category }: { category: CategoryRow }) {
  const t = useTranslations("Categories.actions")
  const [open, setOpen] = useState(false)

  return (
    <>
      <RowActions
        label={t("openMenu")}
        actions={[{ label: t("edit"), onClick: () => setOpen(true) }]}
      />
      <CategoryDialog category={category} open={open} onOpenChange={setOpen} />
    </>
  )
}

function CategoryDialog({
  category,
  open,
  onOpenChange,
}: {
  // Without a category the dialog creates one; with one it edits it.
  category?: CategoryRow
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const t = useTranslations("Categories.form")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{category ? t("editTitle") : t("createTitle")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        {/* Mounted with the dialog, so the fields start fresh on every open. */}
        <CategoryForm category={category} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}

function CategoryForm({
  category: current,
  onDone,
}: {
  category?: CategoryRow
  onDone: () => void
}) {
  const t = useTranslations("Categories")
  // The values the form opened with: the row refreshes after a save while
  // the dialog is still closing, and the defaults must not change then.
  const [category] = useState(current)
  const [kind, setKind] = useState<CategoryRow["kind"]>(
    category?.kind ?? "expense"
  )
  const [active, setActive] = useState(category?.active ?? true)
  const [isPending, startTransition] = useTransition()

  const kinds = (["expense", "income"] as const).map((value) => ({
    value,
    label: t(`kinds.${value}`),
  }))

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)

    startTransition(async () => {
      const result = await saveCategory(category?.id ?? null, {
        kind,
        name: {
          es: String(formData.get("nameEs") ?? ""),
          en: String(formData.get("nameEn") ?? ""),
        },
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
            <FieldLabel htmlFor="category-name-es">{t("form.nameEs")}</FieldLabel>
            <Input
              id="category-name-es"
              name="nameEs"
              defaultValue={category?.name.es}
              autoComplete="off"
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="category-name-en">{t("form.nameEn")}</FieldLabel>
            <Input
              id="category-name-en"
              name="nameEn"
              defaultValue={category?.name.en}
              autoComplete="off"
              required
            />
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="category-kind">{t("form.kind")}</FieldLabel>
          <Select
            items={kinds}
            value={kind}
            onValueChange={(value) => value && setKind(value)}
            disabled={category?.system}
          >
            <SelectTrigger id="category-kind" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {kinds.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field orientation="horizontal" data-disabled={category?.system}>
          <Checkbox
            id="category-active"
            checked={active}
            onCheckedChange={setActive}
            disabled={category?.system}
          />
          <FieldContent>
            <FieldLabel htmlFor="category-active">{t("form.active")}</FieldLabel>
            <FieldDescription>
              {category?.system
                ? t("form.systemDescription")
                : t("form.activeDescription")}
            </FieldDescription>
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
