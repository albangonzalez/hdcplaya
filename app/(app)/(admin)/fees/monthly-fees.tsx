import { getFormatter, getTranslations } from "next-intl/server"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  getFeeSettings,
  getFeeUnits,
  getMonthlyFees,
  getNextFeePeriod,
} from "@/lib/data/fees"
import { periodDate } from "@/lib/fees"
import { OWNERSHIP_SHARE_TOTAL } from "@/models/unit"
import { FeesSection } from "./fees-section"
import { GenerateFeesDialog } from "./generate-fees-dialog"

export async function MonthlyFees() {
  const [t, format, months, settings, units, nextPeriod] = await Promise.all([
    getTranslations("Fees.monthly"),
    getFormatter(),
    getMonthlyFees(),
    getFeeSettings(),
    getFeeUnits(),
    getNextFeePeriod(),
  ])

  return (
    <FeesSection
      title={t("title")}
      action={
        <GenerateFeesDialog
          settings={settings}
          units={units}
          sharesAddUp={
            units.reduce((sum, unit) => sum + unit.ownershipShare, 0) ===
            OWNERSHIP_SHARE_TOTAL
          }
          generatedPeriods={months.map((month) => month.period)}
          defaultPeriod={nextPeriod}
        />
      }
    >
      <Table>
        <TableHeader className="bg-muted">
          <TableRow>
            <TableHead>{t("columns.period")}</TableHead>
            <TableHead>{t("columns.dueDate")}</TableHead>
            <TableHead>{t("columns.units")}</TableHead>
            <TableHead className="text-right">{t("columns.total")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {months.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="h-24 text-center">
                {t("empty")}
              </TableCell>
            </TableRow>
          ) : (
            months.map((month) => (
              <TableRow key={month.period}>
                <TableCell className="font-medium">
                  {format.dateTime(periodDate(month.period), {
                    month: "long",
                    year: "numeric",
                    timeZone: "UTC",
                  })}
                </TableCell>
                <TableCell>
                  {format.dateTime(new Date(month.dueDate), {
                    dateStyle: "medium",
                    timeZone: "UTC",
                  })}
                </TableCell>
                <TableCell className="tabular-nums">
                  {format.number(month.units)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {format.number(month.total / 100, {
                    style: "currency",
                    currency: "MXN",
                  })}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </FeesSection>
  )
}
