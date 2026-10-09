"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
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
      toast.error(error.message)
      setPending(false)
      return
    }

    router.push("/dashboard")
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
            or
          </FieldSeparator>
          <Field>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="your@email.com"
              required
            />
          </Field>
          <Field>
            <div className="flex items-center">
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <a
                href="#"
                className="ml-auto text-sm underline-offset-4 hover:underline"
              >
                Forgot your password?
              </a>
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
              {pending ? "Logging in…" : "Login"}
            </Button>
            <FieldDescription className="text-center">
              Don&apos;t have an account? <a href="#">Sign up</a>
            </FieldDescription>
          </Field>
        </FieldGroup>
      </form>
    </div>
  )
}

// Toasts when /auth/callback sends the user back after a failed OAuth sign-in.
function OAuthError() {
  const searchParams = useSearchParams()
  const hasError = searchParams.has("error")

  useEffect(() => {
    if (hasError) {
      toast.error("Sign-in failed. Please try again.", { id: "oauth-error" })
    }
  }, [hasError])

  return null
}
