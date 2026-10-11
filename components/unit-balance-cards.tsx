import Link from "next/link"
import { ChevronRightIcon } from "lucide-react"
import { getTranslations } from "next-intl/server"

import type { UnitBalance } from "@/lib/data/unit-accounts"
import { formatMoney } from "@/lib/format"
import { getFormat } from "@/lib/format-server"

// One card per unit with what it owes, leading to the unit's detail page.
export async function UnitBalanceCards({ units }: { units: UnitBalance[] }) {
  const [t, format] = await Promise.all([
    getTranslations("Balances"),
    getFormat(),
  ])

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
              <dt className="text-muted-foreground">{t("regular")}</dt>
              <dd className="text-right tabular-nums">
                {formatMoney(format, unit.regular.outstanding)}
              </dd>
              <dt className="text-muted-foreground">{t("special")}</dt>
              <dd className="text-right tabular-nums">
                {formatMoney(format, unit.special.outstanding)}
              </dd>
              {unit.credit > 0 && (
                <>
                  <dt className="text-muted-foreground">{t("credit")}</dt>
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
                ? t("overdue", { amount: formatMoney(format, overdue) })
                : t("nothingOverdue")}
            </p>
          </Link>
        )
      })}
    </div>
  )
}
