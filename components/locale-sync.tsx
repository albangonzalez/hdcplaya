"use client"

import { useEffect } from "react"
import { useLocale } from "next-intl"

import { setLocale } from "@/i18n/actions"

// Applies the language saved on the user's account when this browser is
// showing another one, as on a first sign-in from a new device.
export function LocaleSync({ language }: { language: string }) {
  const locale = useLocale()

  useEffect(() => {
    if (language !== locale) {
      setLocale(language, false)
    }
  }, [language, locale])

  return null
}
