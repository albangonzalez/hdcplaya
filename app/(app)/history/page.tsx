import { Suspense } from "react"
import { redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"

import { TableSkeleton } from "@/components/table-skeleton"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getHistory } from "@/lib/data/history"
import { getFormat } from "@/lib/format-server"

export default function HistoryPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
      <Suspense fallback={<TableSkeleton rows={8} />}>
        <History />
      </Suspense>
    </div>
  )
}

// The audit trail: who created, edited or cancelled what, and when. For the
// Comité de Vigilancia and the admin; owners are sent to the dashboard.
async function History() {
  const [t, format, entries] = await Promise.all([
    getTranslations("History"),
    getFormat(),
    getHistory(),
  ])
  if (!entries) {
    redirect("/")
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader className="bg-muted">
          <TableRow>
            <TableHead>{t("columns.at")}</TableHead>
            <TableHead>{t("columns.actor")}</TableHead>
            <TableHead>{t("columns.action")}</TableHead>
            <TableHead>{t("columns.changes")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="h-24 text-center">
                {t("empty")}
              </TableCell>
            </TableRow>
          ) : (
            entries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="whitespace-nowrap">
                  {format.dateTime(new Date(entry.at), {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </TableCell>
                <TableCell className="font-medium">{entry.actor}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={entry.action === "cancel" ? "destructive" : "outline"}
                    >
                      {t(`actions.${entry.action}`)}
                    </Badge>
                    {t(`collections.${entry.collection}`)}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {entry.changedFields.join(", ")}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
