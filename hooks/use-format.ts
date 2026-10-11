import { useMemo } from "react"
import { useLocale } from "next-intl"

import { createRegionalFormatter } from "@/lib/format"

// The formatter for Client Components, in place of next-intl's own.
export function useFormat() {
  const locale = useLocale()
  return useMemo(() => createRegionalFormatter(locale), [locale])
}
