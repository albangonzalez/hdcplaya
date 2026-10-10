"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { cn } from "cn"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/supabase/client"
import { FacebookOAuthButton } from "./auth/FacebookOAuthButton"
import { GoogleOAuthButton } from "./auth/GoogleOAuthButton"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const t = useTranslations("Login")
  const router = useRouter()
  const [pending, setPending] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)

    setPending(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email: String(formData.get("email")),
      password: String(formData.get("password")),
    })

    if (error) {
      toast.error(
        error.code === "invalid_credentials"
          ? t("invalidCredentials")
          : t("signInFailed")
      )
      setPending(false)
      return
    }

    router.push("/")
    router.refresh()
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <form onSubmit={handleSubmit}>
        <FieldGroup>
          <Field>
            <GoogleOAuthButton />
            <FacebookOAuthButton />
            <Suspense>
              <OAuthError />
            </Suspense>
          </Field>
          <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
            {t("or")}
          </FieldSeparator>
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
            <div className="flex items-center">
              <FieldLabel htmlFor="password">{t("password")}</FieldLabel>
              <Link
                href="/auth/forgot-password"
                className="ml-auto text-sm underline-offset-4 hover:underline"
              >
                {t("forgotPassword")}
              </Link>
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </Field>
          <Field>
            <Button type="submit" disabled={pending}>
              {pending ? t("submitting") : t("submit")}
            </Button>
            <FieldDescription className="text-center">
              {t("noAccount")} <a href="#">{t("signUp")}</a>
            </FieldDescription>
          </Field>
        </FieldGroup>
      </form>
    </div>
  )
}

// Toasts when /auth/callback sends the user back after a failed OAuth sign-in.
function OAuthError() {
  const t = useTranslations("Login")
  const searchParams = useSearchParams()
  const hasError = searchParams.has("error")

  useEffect(() => {
    if (hasError) {
      toast.error(t("signInFailed"), { id: "oauth-error" })
    }
  }, [hasError, t])

  return null
}
