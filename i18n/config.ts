export const locales = ["es", "en"] as const

export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = "es"

export const localeCookieName = "locale"

export function isLocale(value: string | undefined): value is Locale {
  return locales.includes(value as Locale)
}
