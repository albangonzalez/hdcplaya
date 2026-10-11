"use client"

import { useState, useTransition } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"

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
import type { UserRow } from "@/lib/data/users"
import { createUser, updateUser } from "./actions"

type UserFormDialogProps = {
  // Without a user the dialog creates one; with a user it edits it.
  user?: UserRow
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UserFormDialog({
  user,
  open,
  onOpenChange,
}: UserFormDialogProps) {
  const t = useTranslations("Users.form")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{user ? t("editTitle") : t("createTitle")}</DialogTitle>
          <DialogDescription>
            {user
              ? t("editDescription", { name: user.fullName })
              : t("createDescription")}
          </DialogDescription>
        </DialogHeader>
        {/* Mounted with the dialog, so the fields start fresh on every open. */}
        <UserForm user={user} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}

function UserForm({
  user: currentUser,
  onDone,
}: {
  user?: UserRow
  onDone: () => void
}) {
  const t = useTranslations("Users")
  // The values the form opened with: the row refreshes after a save while
  // the dialog is still closing, and the defaults must not change then.
  const [user] = useState(currentUser)
  const [role, setRole] = useState<UserRow["role"]>(user?.role ?? "owner")
  const [language, setLanguage] = useState<UserRow["language"]>(
    user?.language ?? "es"
  )
  const [isCommittee, setIsCommittee] = useState(user?.isCommittee ?? false)

  const roles = (["owner", "admin"] as const).map((value) => ({
    value,
    label: t(`roles.${value}`),
  }))
  const languages = (["es", "en"] as const).map((value) => ({
    value,
    label: t(`languages.${value}`),
  }))

  const [isPending, startTransition] = useTransition()

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)
    const text = (name: string) => String(formData.get(name) ?? "").trim()
    const email = text("email")

    startTransition(async () => {
      if (user) {
        const result = await updateUser(user.id, {
          firstName: text("firstName"),
          firstLastName: text("firstLastName"),
          secondLastName: text("secondLastName") || null,
          role,
          isCommittee,
          language,
        })

        if (result.ok) {
          toast.success(t("form.saved"))
          onDone()
        } else {
          toast.error(t(`form.errors.${result.error}`))
        }
        return
      }

      const result = await createUser({
        email,
        firstName: text("firstName"),
        firstLastName: text("firstLastName"),
        secondLastName: text("secondLastName") || null,
        role,
        isCommittee,
        language,
      })

      if (result.ok) {
        toast.success(t("form.created", { email }))
        onDone()
      } else {
        toast.error(t(`form.errors.${result.error}`))
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <FieldGroup className="gap-4">
        <Field>
          <FieldLabel htmlFor="user-first-name">
            {t("form.firstName")}
          </FieldLabel>
          <Input
            id="user-first-name"
            name="firstName"
            defaultValue={user?.firstName}
            autoComplete="off"
            required
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="user-first-last-name">
              {t("form.firstLastName")}
            </FieldLabel>
            <Input
              id="user-first-last-name"
              name="firstLastName"
              defaultValue={user?.firstLastName}
              autoComplete="off"
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="user-second-last-name">
              {t("form.secondLastName")}
              <span className="font-normal text-muted-foreground">
                ({t("form.optional")})
              </span>
            </FieldLabel>
            <Input
              id="user-second-last-name"
              name="secondLastName"
              defaultValue={user?.secondLastName ?? ""}
              autoComplete="off"
            />
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="user-email">{t("form.email")}</FieldLabel>
          <Input
            id="user-email"
            name="email"
            type="email"
            defaultValue={user?.email}
            autoComplete="off"
            // The e-mail is the person's sign-in identity: fixed once invited.
            disabled={Boolean(user)}
            required
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="user-role">{t("form.role")}</FieldLabel>
            <Select
              name="role"
              items={roles}
              value={role}
              onValueChange={(value) => {
                if (!value) return
                setRole(value)
                // Only an owner can be a committee member.
                if (value !== "owner") setIsCommittee(false)
              }}
            >
              <SelectTrigger id="user-role" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roles.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="user-language">
              {t("form.language")}
            </FieldLabel>
            <Select
              name="language"
              items={languages}
              value={language}
              onValueChange={(value) => value && setLanguage(value)}
            >
              <SelectTrigger id="user-language" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {languages.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <Field orientation="horizontal" data-disabled={role !== "owner"}>
          <Checkbox
            id="user-is-committee"
            name="isCommittee"
            checked={isCommittee}
            onCheckedChange={setIsCommittee}
            disabled={role !== "owner"}
          />
          <FieldContent>
            <FieldLabel htmlFor="user-is-committee">
              {t("form.isCommittee")}
            </FieldLabel>
            <FieldDescription>
              {t("form.isCommitteeDescription")}
            </FieldDescription>
          </FieldContent>
        </Field>
      </FieldGroup>
      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>
          {t("form.cancel")}
        </DialogClose>
        <Button type="submit" disabled={isPending}>
          {user ? t("form.save") : t("form.create")}
        </Button>
      </DialogFooter>
    </form>
  )
}
