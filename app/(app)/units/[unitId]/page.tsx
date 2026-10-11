import { Suspense } from "react"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"

import { BalanceCards } from "@/components/balance-cards"
import { StatsCardsSkeleton } from "@/components/stats-cards"
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
import { getUnitDetail } from "@/lib/data/unit-accounts"
import { periodDate } from "@/lib/fees"
import { formatMoney } from "@/lib/format"
import { getFormat } from "@/lib/format-server"
import { AddPlateButton, RemovePlateButton } from "./plate-controls"
import { AddTenantButton, TenantRowActions } from "./tenant-controls"

export default function UnitPage({ params }: PageProps<"/units/[unitId]">) {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
      <Suspense
        fallback={
          <>
            <StatsCardsSkeleton />
            <TableSkeleton />
          </>
        }
      >
        <UnitDetail params={params} />
      </Suspense>
    </div>
  )
}

function Section({
  title,
  action,
  children,
}: {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex min-h-8 items-center justify-between gap-2">
        <h2 className="font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

// One unit, for its owners and the admin: what it owes, its charges and
// payments, and the tenants and licence plates they keep up to date.
async function UnitDetail({
  params,
}: Pick<PageProps<"/units/[unitId]">, "params">) {
  const { unitId } = await params
  const [t, format, detail] = await Promise.all([
    getTranslations("UnitDetail"),
    getFormat(),
    getUnitDetail(unitId),
  ])
  if (!detail) {
    notFound()
  }

  const { balance } = detail
  const date = (value: string) =>
    format.dateTime(new Date(value), { dateStyle: "medium", timeZone: "UTC" })

  return (
    <>
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold">
          {t("title", { identifier: balance.identifier })}
        </h2>
        <p className="text-sm text-muted-foreground">
          {balance.owners.length > 0
            ? balance.owners.join(", ")
            : t("noOwner")}
          {" · "}
          {t("shares", { shares: detail.ownershipShare })}
        </p>
      </div>
      <BalanceCards
        regular={balance.regular}
        special={balance.special}
        credit={balance.credit}
      />

      <Section title={t("charges.title")}>
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead>{t("charges.concept")}</TableHead>
                <TableHead>{t("charges.dueDate")}</TableHead>
                <TableHead className="text-right">
                  {t("charges.amount")}
                </TableHead>
                <TableHead className="text-right">{t("charges.paid")}</TableHead>
                <TableHead>{t("charges.status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {detail.charges.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    {t("charges.empty")}
                  </TableCell>
                </TableRow>
              ) : (
                detail.charges.map((charge) => (
                  <TableRow key={charge.id}>
                    <TableCell className="font-medium capitalize">
                      {charge.period
                        ? format.dateTime(periodDate(charge.period), {
                            month: "long",
                            year: "numeric",
                            timeZone: "UTC",
                          })
                        : charge.description}
                    </TableCell>
                    <TableCell>{date(charge.dueDate)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(format, charge.amount)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(format, charge.paidAmount)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={charge.overdue ? "destructive" : "outline"}
                      >
                        {charge.overdue
                          ? t("charges.overdue")
                          : t(`charges.statuses.${charge.status}`)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Section>

      <Section title={t("payments.title")}>
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead>{t("payments.date")}</TableHead>
                <TableHead>{t("payments.method")}</TableHead>
                <TableHead className="text-right">
                  {t("payments.amount")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {detail.payments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center">
                    {t("payments.empty")}
                  </TableCell>
                </TableRow>
              ) : (
                detail.payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {date(payment.date)}
                        {payment.status === "cancelled" && (
                          <Badge variant="outline">
                            {t("payments.cancelled")}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {t(`payments.methods.${payment.method}`)}
                    </TableCell>
                    <TableCell
                      className={
                        payment.status === "cancelled"
                          ? "text-right text-muted-foreground tabular-nums line-through"
                          : "text-right tabular-nums"
                      }
                    >
                      {formatMoney(format, payment.amount)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Section>

      <Section
        title={t("tenants.title")}
        action={<AddTenantButton unitId={balance.id} today={detail.today} />}
      >
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead>{t("tenants.name")}</TableHead>
                <TableHead>{t("tenants.contact")}</TableHead>
                <TableHead>{t("tenants.period")}</TableHead>
                <TableHead className="w-12">
                  <span className="sr-only">{t("actions")}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {detail.tenants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    {t("tenants.empty")}
                  </TableCell>
                </TableRow>
              ) : (
                detail.tenants.map((tenant) => (
                  <TableRow key={tenant.id}>
                    <TableCell className="font-medium">
                      {[
                        tenant.firstName,
                        tenant.firstLastName,
                        tenant.secondLastName,
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    </TableCell>
                    <TableCell>{tenant.contact}</TableCell>
                    <TableCell>
                      {tenant.to
                        ? t("tenants.fromTo", {
                            from: date(tenant.from),
                            to: date(tenant.to),
                          })
                        : t("tenants.since", { from: date(tenant.from) })}
                    </TableCell>
                    <TableCell>
                      <TenantRowActions
                        unitId={balance.id}
                        tenant={tenant}
                        today={detail.today}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Section>

      <Section title={t("parking.title")}>
        {detail.parkingSpaces.length === 0 ? (
          <p className="rounded-lg border p-6 text-center text-sm">
            {t("parking.empty")}
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {detail.parkingSpaces.map((space) => (
              <div
                key={space.id}
                className="flex flex-col gap-3 rounded-lg border p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-medium">
                    {t("parking.space", { label: space.label })}
                  </h3>
                  <AddPlateButton unitId={balance.id} spaceId={space.id} />
                </div>
                {space.plates.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {t("parking.noPlates")}
                  </p>
                ) : (
                  <ul className="flex flex-col gap-1 text-sm">
                    {space.plates.map((plate) => (
                      <li
                        key={plate.id}
                        className="flex items-center justify-between gap-2"
                      >
                        <span>
                          <span className="font-medium">{plate.plate}</span>
                          {plate.note && (
                            <span className="text-muted-foreground">
                              {" · "}
                              {plate.note}
                            </span>
                          )}
                        </span>
                        <RemovePlateButton
                          unitId={balance.id}
                          plateId={plate.id}
                          plate={plate.plate}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>
    </>
  )
}
