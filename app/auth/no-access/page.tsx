"use client"

import { useEffect } from "react"
import Link from "next/link"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"

// Where a signed-in person without access lands: never invited (for example
// an unknown Google or Facebook account) or deactivated. Their session is
// closed here, since the login page sends signed-in visitors back to the app.
export default function NoAccessPage() {
  const t = useTranslations("NoAccess")

  useEffect(() => {
    createClient().auth.signOut()
  }, [])

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="flex w-full max-w-xs flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
        <Button variant="outline" render={<Link href="/login" />}>
          {t("backToLogin")}
        </Button>
      </div>
    </div>
  )
}
