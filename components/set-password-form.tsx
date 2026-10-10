"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { cn } from "cn"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { activateCurrentUser } from "@/app/auth/set-password/actions"
import { createClient } from "@/lib/supabase/client"

const MIN_PASSWORD_LENGTH = 8

export function SetPasswordForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const t = useTranslations("SetPassword")
  const router = useRouter()
  const [pending, setPending] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const password = String(formData.get("password"))

    if (password !== String(formData.get("confirmPassword"))) {
      toast.error(t("mismatch"))
      return
    }

    setPending(true)

    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      toast.error(
        error.code === "weak_password"
          ? t("weakPassword")
          : error.code === "same_password"
            ? t("samePassword")
            : t("failed")
      )
      setPending(false)
      return
    }

    // An invited user becomes active once they have a password.
    try {
      await activateCurrentUser()
    } catch {
      toast.error(t("failed"))
      setPending(false)
      return
    }

    toast.success(t("saved"))
    router.push("/")
    router.refresh()
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <form onSubmit={handleSubmit}>
        <FieldGroup>
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-semibold">{t("title")}</h1>
            <p className="text-sm text-muted-foreground">{t("description")}</p>
          </div>
          <Field>
            <FieldLabel htmlFor="password">{t("password")}</FieldLabel>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={MIN_PASSWORD_LENGTH}
              required
            />
            <FieldDescription>
              {t("hint", { min: MIN_PASSWORD_LENGTH })}
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="confirmPassword">
              {t("confirmPassword")}
            </FieldLabel>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              minLength={MIN_PASSWORD_LENGTH}
              required
            />
          </Field>
          <Field>
            <Button type="submit" disabled={pending}>
              {pending ? t("submitting") : t("submit")}
            </Button>
          </Field>
        </FieldGroup>
      </form>
    </div>
  )
}
