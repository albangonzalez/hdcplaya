import { Suspense } from "react"
import Link from "next/link"
import { ChevronRightIcon } from "lucide-react"
import { getTranslations } from "next-intl/server"

import { Skeleton } from "@/components/ui/skeleton"
import { getMyUnits } from "@/lib/data/unit-accounts"
import { formatMoney } from "@/lib/format"
import { getFormat } from "@/lib/format-server"

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
  const [t, tBalances, format, units] = await Promise.all([
    getTranslations("MyUnits"),
    getTranslations("Balances"),
    getFormat(),
    getMyUnits(),
  ])

  if (units.length === 0) {
    return (
      <p className="rounded-lg border p-6 text-center text-sm">{t("empty")}</p>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {units.map((unit) => {
        const overdue = unit.regular.overdue + unit.special.overdue
        return (
          <Link
            key={unit.id}
            href={`/units/${unit.id}`}
            className="flex flex-col gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/50"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {t("unit", { identifier: unit.identifier })}
              </h2>
              <ChevronRightIcon className="size-4 text-muted-foreground" />
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <dt className="text-muted-foreground">{tBalances("regular")}</dt>
              <dd className="text-right tabular-nums">
                {formatMoney(format, unit.regular.outstanding)}
              </dd>
              <dt className="text-muted-foreground">{tBalances("special")}</dt>
              <dd className="text-right tabular-nums">
                {formatMoney(format, unit.special.outstanding)}
              </dd>
              {unit.credit > 0 && (
                <>
                  <dt className="text-muted-foreground">
                    {tBalances("credit")}
                  </dt>
                  <dd className="text-right tabular-nums">
                    {formatMoney(format, unit.credit)}
                  </dd>
                </>
              )}
            </dl>
            <p
              className={
                overdue > 0
                  ? "text-sm text-destructive"
                  : "text-sm text-muted-foreground"
              }
            >
              {overdue > 0
                ? tBalances("overdue", { amount: formatMoney(format, overdue) })
                : tBalances("nothingOverdue")}
            </p>
          </Link>
        )
      })}
    </div>
  )
}
