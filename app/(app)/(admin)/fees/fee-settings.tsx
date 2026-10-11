import { getTranslations } from "next-intl/server"

import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatMoney } from "@/lib/format"
import { getFormat } from "@/lib/format-server"
import { getFeeSettings, getNextFeePeriod } from "@/lib/data/fees"
import { findFeeSetting, periodDate } from "@/lib/fees"
import { FeeSettingDialog } from "./fee-setting-dialog"
import { FeesSection } from "./fees-section"

export async function FeeSettings() {
  const [t, format, settings, nextPeriod] = await Promise.all([
    getTranslations("Fees.settings"),
    getFormat(),
    getFeeSettings(),
    getNextFeePeriod(),
  ])

  // The settings the next month to generate will use.
  const inForce = findFeeSetting(settings, nextPeriod)

  return (
    <FeesSection
      title={t("title")}
      action={<FeeSettingDialog defaultPeriod={nextPeriod} current={inForce} />}
    >
      <Table>
        <TableHeader className="bg-muted">
          <TableRow>
            <TableHead>{t("columns.effectiveFrom")}</TableHead>
            <TableHead>{t("columns.monthlyBudget")}</TableHead>
            <TableHead>{t("columns.dueDay")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {settings.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} className="h-24 text-center">
                {t("empty")}
              </TableCell>
            </TableRow>
          ) : (
            settings.map((setting) => (
              <TableRow key={setting.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {format.dateTime(periodDate(setting.effectiveFrom), {
                      month: "long",
                      year: "numeric",
                      timeZone: "UTC",
                    })}
                    {setting.id === inForce?.id && (
                      <Badge variant="secondary">{t("inForce")}</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="tabular-nums">
                  {formatMoney(format, setting.monthlyBudget)}
                </TableCell>
                <TableCell className="tabular-nums">{setting.dueDay}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </FeesSection>
  )
}
