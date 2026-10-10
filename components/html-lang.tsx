"use client"

import { useEffect } from "react"
import { useLocale } from "next-intl"

// Keeps <html lang> in step with the active locale. The root layout can only
// render the default, because the locale is read from a cookie per request.
export function HtmlLang() {
  const locale = useLocale()

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  return null
}
