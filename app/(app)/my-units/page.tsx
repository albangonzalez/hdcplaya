import { Suspense } from "react"
import { getTranslations } from "next-intl/server"

import { UnitBalanceCards } from "@/components/unit-balance-cards"
import { Skeleton } from "@/components/ui/skeleton"
import { getMyUnits } from "@/lib/data/unit-accounts"

export default function MyUnitsPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
      <Suspense fallback={<Skeleton className="h-32 w-full rounded-lg" />}>
        <MyUnits />
      </Suspense>
    </div>
  )
}

// The units the signed-in user owns, each leading to its detail page.
async function MyUnits() {
  const [t, units] = await Promise.all([
    getTranslations("MyUnits"),
    getMyUnits(),
  ])

  if (units.length === 0) {
    return (
      <p className="rounded-lg border p-6 text-center text-sm">{t("empty")}</p>
    )
  }

  return <UnitBalanceCards units={units} />
}
