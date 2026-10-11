"use client"

import { useFormatter, useTranslations } from "next-intl"

import type { FeeUnit } from "@/lib/data/fees"
import { splitByShares } from "@/lib/fees"

// What each unit would be charged for `total` (centavos), before saving.
export function ChargePreview({
  units,
  total,
}: {
  units: FeeUnit[]
  total: number
}) {
  const t = useTranslations("Fees.preview")
  const format = useFormatter()
  const amounts = splitByShares(
    total,
    units.map((unit) => unit.ownershipShare)
  )
  const money = (centavos: number) =>
    format.number(centavos / 100, { style: "currency", currency: "MXN" })

  return (
    <div className="overflow-hidden rounded-md border text-sm">
      <div className="flex justify-between bg-muted px-3 py-2 font-medium">
        <span>{t("unit")}</span>
        <span>{t("amount")}</span>
      </div>
      <div className="max-h-44 overflow-y-auto">
        {units.map((unit, index) => (
          <div
            key={unit.identifier}
            className="flex justify-between border-t px-3 py-1.5"
          >
            <span>{unit.identifier}</span>
            <span className="tabular-nums">{money(amounts[index])}</span>
          </div>
        ))}
      </div>
      <div className="flex justify-between border-t px-3 py-2 font-medium">
        <span>{t("total", { count: units.length })}</span>
        <span className="tabular-nums">{money(total)}</span>
      </div>
    </div>
  )
}
