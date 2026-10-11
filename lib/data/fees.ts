import { condoToday } from "@/lib/condo-time"
import { requireAdmin } from "@/lib/auth"
import { findFeeSetting, nextPeriod, type FeeSettingValue } from "@/lib/fees"
import { chargesCollection } from "@/models/charge"
import { feeSettingsCollection } from "@/models/fee-setting"
import { specialAssessmentsCollection } from "@/models/special-assessment"
import { unitsCollection } from "@/models/unit"

// Plain values only, so they can be passed to Client Components. Amounts are
// centavos and dates are ISO strings.
export type FeeSettingRow = FeeSettingValue & { id: string }

export type MonthlyFeeRow = {
  period: string
  dueDate: string
  units: number
  total: number
}

export type SpecialAssessmentRow = {
  id: string
  description: string
  total: number
  dueDate: string
  createdAt: string
}

export type FeeUnit = {
  identifier: string
  ownershipShare: number
}

export type FeeStats = {
  // Null until the first settings are saved.
  monthlyBudget: number | null
  dueDay: number | null
  // Null until fees are generated for the first time.
  lastPeriod: string | null
  lastPeriodTotal: number
  // Special assessments that some unit has not finished paying.
  pendingAssessments: number
  pendingAssessmentsAmount: number
}

// The current month where the condo is, as "YYYY-MM".
function currentPeriod(): string {
  return condoToday().slice(0, 7)
}

export async function getFeeSettings(): Promise<FeeSettingRow[]> {
  await requireAdmin()

  const settings = await feeSettingsCollection()
    .find()
    .sort({ effectiveFrom: -1 })
    .toArray()

  return settings.map((setting) => ({
    id: setting._id.toHexString(),
    effectiveFrom: setting.effectiveFrom,
    monthlyBudget: setting.monthlyBudget,
    dueDay: setting.dueDay,
  }))
}

// One row per month for which fees were generated, latest first.
export async function getMonthlyFees(): Promise<MonthlyFeeRow[]> {
  await requireAdmin()

  const months = await chargesCollection()
    .aggregate<{ _id: string; dueDate: Date; units: number; total: number }>([
      { $match: { kind: "regular", status: { $ne: "cancelled" } } },
      {
        $group: {
          _id: "$period",
          dueDate: { $min: "$dueDate" },
          units: { $sum: 1 },
          total: { $sum: "$amount" },
        },
      },
      { $sort: { _id: -1 } },
    ])
    .toArray()

  return months.map((month) => ({
    period: month._id,
    dueDate: month.dueDate.toISOString(),
    units: month.units,
    total: month.total,
  }))
}

export async function getSpecialAssessments(): Promise<SpecialAssessmentRow[]> {
  await requireAdmin()

  const assessments = await specialAssessmentsCollection()
    .find()
    .sort({ createdAt: -1 })
    .toArray()

  return assessments.map((assessment) => ({
    id: assessment._id.toHexString(),
    description: assessment.description,
    total: assessment.total,
    dueDate: assessment.dueDate.toISOString(),
    createdAt: assessment.createdAt.toISOString(),
  }))
}

// Every unit is charged, with or without an owner.
export async function getFeeUnits(): Promise<FeeUnit[]> {
  await requireAdmin()

  const units = await unitsCollection()
    .find()
    .sort({ identifier: 1 })
    .collation({ locale: "es", numericOrdering: true })
    .toArray()

  return units.map((unit) => ({
    identifier: unit.identifier,
    ownershipShare: unit.ownershipShare,
  }))
}

// The month a dialog proposes: the one after the last generated, or the
// current month when nothing has been generated yet.
export async function getNextFeePeriod(): Promise<string> {
  const [latest] = await getMonthlyFees()
  return latest ? nextPeriod(latest.period) : currentPeriod()
}

export async function getFeeStats(): Promise<FeeStats> {
  // First, before any query starts: it also waits for the request.
  await requireAdmin()

  const [settings, months, pending] = await Promise.all([
    getFeeSettings(),
    getMonthlyFees(),
    chargesCollection()
      .aggregate<{ _id: unknown; amount: number }>([
        { $match: { kind: "special", status: { $in: ["open", "partial"] } } },
        {
          $group: {
            _id: "$specialAssessmentId",
            amount: { $sum: { $subtract: ["$amount", "$paidAmount"] } },
          },
        },
      ])
      .toArray(),
  ])

  const current = findFeeSetting(settings, currentPeriod())

  return {
    monthlyBudget: current?.monthlyBudget ?? null,
    dueDay: current?.dueDay ?? null,
    lastPeriod: months[0]?.period ?? null,
    lastPeriodTotal: months[0]?.total ?? 0,
    pendingAssessments: pending.length,
    pendingAssessmentsAmount: pending.reduce(
      (sum, assessment) => sum + assessment.amount,
      0
    ),
  }
}
