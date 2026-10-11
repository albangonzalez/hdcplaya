import { getTranslations } from "next-intl/server"

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
import { getFeeUnits, getSpecialAssessments } from "@/lib/data/fees"
import { OWNERSHIP_SHARE_TOTAL } from "@/models/unit"
import { FeesSection } from "./fees-section"
import { SpecialAssessmentDialog } from "./special-assessment-dialog"

export async function SpecialAssessments() {
  const [t, format, assessments, units] = await Promise.all([
    getTranslations("Fees.special"),
    getFormat(),
    getSpecialAssessments(),
    getFeeUnits(),
  ])

  return (
    <FeesSection
      title={t("title")}
      action={
        <SpecialAssessmentDialog
          units={units}
          sharesAddUp={
            units.reduce((sum, unit) => sum + unit.ownershipShare, 0) ===
            OWNERSHIP_SHARE_TOTAL
          }
        />
      }
    >
      <Table>
        <TableHeader className="bg-muted">
          <TableRow>
            <TableHead>{t("columns.description")}</TableHead>
            <TableHead>{t("columns.dueDate")}</TableHead>
            <TableHead>{t("columns.createdAt")}</TableHead>
            <TableHead className="text-right">{t("columns.total")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {assessments.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="h-24 text-center">
                {t("empty")}
              </TableCell>
            </TableRow>
          ) : (
            assessments.map((assessment) => (
              <TableRow key={assessment.id}>
                <TableCell className="font-medium">
                  {assessment.description}
                </TableCell>
                <TableCell>
                  {format.dateTime(new Date(assessment.dueDate), {
                    dateStyle: "medium",
                    timeZone: "UTC",
                  })}
                </TableCell>
                <TableCell>
                  {format.dateTime(new Date(assessment.createdAt), {
                    dateStyle: "medium",
                  })}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatMoney(format, assessment.total)}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </FeesSection>
  )
}
