"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"

import { createClient } from "@/lib/supabase/client"

// Where invitation (and password-reset) e-mail links land. Supabase puts the
// tokens in the URL fragment, which never reaches the server, so the session is
// opened here in the browser before moving on to the password form.
export default function ConfirmPage() {
  const t = useTranslations("SetPassword")
  const router = useRouter()
  const handled = useRef(false)

  useEffect(() => {
    if (handled.current) return
    handled.current = true

    const params = new URLSearchParams(window.location.hash.slice(1))
    const accessToken = params.get("access_token")
    const refreshToken = params.get("refresh_token")

    // An expired or already used link arrives with error parameters instead.
    if (!accessToken || !refreshToken) {
      router.replace("/login?error=link")
      return
    }

    createClient()
      .auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })
      .then(({ error }) => {
        router.replace(error ? "/login?error=link" : "/auth/set-password")
      })
  }, [router])

  return (
    <div className="flex min-h-svh items-center justify-center p-6 text-sm text-muted-foreground">
      {t("verifyingLink")}
    </div>
  )
}
