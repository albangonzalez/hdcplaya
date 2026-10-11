import { getFormatter, getTranslations } from "next-intl/server"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getOwnerOptions, getUnits } from "@/lib/data/units"
import { OWNERSHIP_SHARE_TOTAL } from "@/models/unit"
import { UnitRowActions } from "./unit-row-actions"

export async function UnitsTable() {
  const [t, format, units, ownerOptions] = await Promise.all([
    getTranslations("Units"),
    getFormatter(),
    getUnits(),
    getOwnerOptions(),
  ])

  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader className="bg-muted">
          <TableRow>
            <TableHead>{t("columns.unit")}</TableHead>
            <TableHead>{t("columns.ownershipShare")}</TableHead>
            <TableHead>{t("columns.owners")}</TableHead>
            <TableHead className="w-12">
              <span className="sr-only">{t("columns.actions")}</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {units.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="h-24 text-center">
                {t("empty")}
              </TableCell>
            </TableRow>
          ) : (
            units.map((unit) => (
              <TableRow key={unit.id}>
                <TableCell className="font-medium">{unit.identifier}</TableCell>
                <TableCell className="tabular-nums">
                  {format.number(unit.ownershipShare)}{" "}
                  <span className="text-muted-foreground">
                    (
                    {format.number(unit.ownershipShare / OWNERSHIP_SHARE_TOTAL, {
                      style: "percent",
                      maximumFractionDigits: 2,
                    })}
                    )
                  </span>
                </TableCell>
                <TableCell>
                  {unit.owners.length === 0 ? (
                    <span className="text-muted-foreground">
                      {t("noOwner")}
                    </span>
                  ) : (
                    unit.owners.map((owner) => owner.fullName).join(", ")
                  )}
                </TableCell>
                <TableCell>
                  <UnitRowActions unit={unit} ownerOptions={ownerOptions} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
