import { createFormatter, type Locale } from "next-intl"

import { CONDO_TIME_ZONE } from "@/lib/condo-time"

// Numbers, amounts and dates are written the Mexican way in Spanish
// ("$85,000.00", "10,000"): the plain "es" locale would use Spain's
// separators and put "MXN" after the amount.
const regions: Record<string, string> = { es: "es-MX", en: "en-US" }

export function createRegionalFormatter(locale: string) {
  return createFormatter({
    locale: (regions[locale] ?? locale) as Locale,
    timeZone: CONDO_TIME_ZONE,
  })
}

export type Format = ReturnType<typeof createRegionalFormatter>

// An amount in centavos, as pesos.
export function formatMoney(format: Format, centavos: number): string {
  return format.number(centavos / 100, {
    style: "currency",
    currency: "MXN",
    currencyDisplay: "narrowSymbol",
  })
}
