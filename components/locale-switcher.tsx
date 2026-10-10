"use client"

import { useTransition } from "react"
import { useLocale, useTranslations } from "next-intl"
import { LanguagesIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { setLocale } from "@/i18n/actions"
import { locales } from "@/i18n/config"

// Switches to the other language; with two locales a toggle is enough.
export function LocaleSwitcher() {
  const t = useTranslations("LocaleSwitcher")
  const locale = useLocale()
  const [pending, startTransition] = useTransition()
  const next = locales.find((candidate) => candidate !== locale) ?? locale

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      aria-label={t("label")}
      disabled={pending}
      onClick={() => startTransition(() => setLocale(next))}
    >
      <LanguagesIcon />
      {t(next)}
    </Button>
  )
}
