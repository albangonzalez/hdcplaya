import { getTranslations } from "next-intl/server"

import { StatsCards } from "@/components/stats-cards"
import type { Owed } from "@/lib/data/unit-accounts"
import { formatMoney } from "@/lib/format"
import { getFormat } from "@/lib/format-server"

// What is owed, always split in regular fees and special assessments, plus
// any credit. Used for one unit and for totals.
export async function BalanceCards({
  regular,
  special,
  credit,
}: {
  regular: Owed
  special: Owed
  credit: number
}) {
  const [t, format] = await Promise.all([
    getTranslations("Balances"),
    getFormat(),
  ])
  const owed = (label: string, { outstanding, overdue }: Owed) => ({
    label,
    value: formatMoney(format, outstanding),
    detail: overdue === 0 ? t("nothingOverdue") : null,
    warning:
      overdue > 0 ? t("overdue", { amount: formatMoney(format, overdue) }) : null,
  })

  return (
    <StatsCards
      cards={[
        owed(t("regular"), regular),
        owed(t("special"), special),
        { label: t("credit"), value: formatMoney(format, credit) },
      ]}
    />
  )
}
