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
import { getPayments } from "@/lib/data/payments"
import { PaymentRowActions } from "./payment-row-actions"

export async function PaymentsTable() {
  const [t, format, payments] = await Promise.all([
    getTranslations("Payments"),
    getFormat(),
    getPayments(),
  ])

  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader className="bg-muted">
          <TableRow>
            <TableHead>{t("columns.date")}</TableHead>
            <TableHead>{t("columns.unit")}</TableHead>
            <TableHead>{t("columns.method")}</TableHead>
            <TableHead>{t("columns.account")}</TableHead>
            <TableHead className="text-right">{t("columns.amount")}</TableHead>
            <TableHead className="w-12">
              <span className="sr-only">{t("columns.actions")}</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center">
                {t("empty")}
              </TableCell>
            </TableRow>
          ) : (
            payments.map((payment) => {
              const amount = formatMoney(format, payment.amount)
              const date = format.dateTime(new Date(payment.date), {
                dateStyle: "medium",
                timeZone: "UTC",
              })
              return (
                <TableRow key={payment.id}>
                  <TableCell>{date}</TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {payment.unit}
                      {payment.status === "cancelled" && (
                        <Badge
                          variant="outline"
                          title={payment.cancelReason ?? undefined}
                        >
                          {t("cancelled")}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{t(`methods.${payment.method}`)}</TableCell>
                  <TableCell>{payment.account}</TableCell>
                  <TableCell
                    className={
                      payment.status === "cancelled"
                        ? "text-right text-muted-foreground tabular-nums line-through"
                        : "text-right tabular-nums"
                    }
                  >
                    {amount}
                  </TableCell>
                  <TableCell>
                    <PaymentRowActions
                      payment={payment}
                      summary={t("cancel.summary", {
                        amount,
                        unit: payment.unit,
                        date,
                      })}
                    />
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
    </div>
  )
}
