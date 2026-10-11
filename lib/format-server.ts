import { getLocale } from "next-intl/server"

import { createRegionalFormatter } from "@/lib/format"

// The formatter for Server Components, in place of next-intl's own.
export async function getFormat() {
  return createRegionalFormatter(await getLocale())
}
