"use client"

import { useState } from "react"
import Link from "next/link"
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
import { requestPasswordReset } from "@/app/auth/forgot-password/actions"

export function ForgotPasswordForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const t = useTranslations("ForgotPassword")
  const [pending, setPending] = useState(false)
  // The address the link was sent to, once the request has gone through.
  const [sentTo, setSentTo] = useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const email = String(new FormData(event.currentTarget).get("email"))

    setPending(true)

    try {
      const result = await requestPasswordReset(email)
      if (result.ok) {
        setSentTo(email)
      } else {
        toast.error(
          result.error === "rateLimited" ? t("rateLimited") : t("failed")
        )
      }
    } catch {
      toast.error(t("failed"))
    }

    setPending(false)
  }

  if (sentTo) {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <FieldGroup>
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-semibold">{t("sentTitle")}</h1>
            <p className="text-sm text-muted-foreground">
              {t("sentDescription", { email: sentTo })}
            </p>
          </div>
          <Field>
            <Button variant="outline" onClick={() => setSentTo(null)}>
              {t("tryAnother")}
            </Button>
            <FieldDescription className="text-center">
              <Link href="/login">{t("backToLogin")}</Link>
            </FieldDescription>
          </Field>
        </FieldGroup>
      </div>
    )
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
            <FieldLabel htmlFor="email">{t("email")}</FieldLabel>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder={t("emailPlaceholder")}
              required
            />
          </Field>
          <Field>
            <Button type="submit" disabled={pending}>
              {pending ? t("submitting") : t("submit")}
            </Button>
            <FieldDescription className="text-center">
              <Link href="/login">{t("backToLogin")}</Link>
            </FieldDescription>
          </Field>
        </FieldGroup>
      </form>
    </div>
  )
}
