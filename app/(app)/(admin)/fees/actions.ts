"use server"

import { refresh } from "next/cache"
import { ObjectId } from "mongodb"

import { recordAudit } from "@/lib/audit"
import { requireAdmin } from "@/lib/auth"
import { findFeeSetting, periodDate, splitByShares } from "@/lib/fees"
import { applyCredit } from "@/lib/payment-allocation"
import { chargeSchema, chargesCollection } from "@/models/charge"
import {
  feeSettingInputSchema,
  feeSettingSchema,
  feeSettingsCollection,
} from "@/models/fee-setting"
import { periodSchema } from "@/models/shared"
import {
  specialAssessmentInputSchema,
  specialAssessmentSchema,
  specialAssessmentsCollection,
} from "@/models/special-assessment"
import { OWNERSHIP_SHARE_TOTAL, unitsCollection } from "@/models/unit"

type SplitError = "noUnits" | "sharesMismatch"

export type SaveFeeSettingResult =
  | { ok: true }
  | { ok: false; error: "invalid" | "feesGenerated" | "saveFailed" }

export type GenerateFeesResult =
  | { ok: true; created: number }
  | {
      ok: false
      error: "invalid" | "noSettings" | "saveFailed" | SplitError
    }

export type CreateSpecialAssessmentResult =
  | { ok: true }
  | { ok: false; error: "invalid" | "saveFailed" | SplitError }

// Every unit's part of `total`. All units are charged, with or without an
// owner, and only when their shares cover the whole condo: otherwise the
// parts would not be the ones the shares stand for.
async function splitBetweenUnits(
  total: number
): Promise<
  | { ok: true; parts: { unitId: ObjectId; amount: number }[] }
  | { ok: false; error: SplitError }
> {
  const units = await unitsCollection()
    .find()
    .sort({ identifier: 1 })
    .collation({ locale: "es", numericOrdering: true })
    .toArray()

  if (units.length === 0) {
    return { ok: false, error: "noUnits" }
  }

  const shares = units.map((unit) => unit.ownershipShare)
  if (shares.reduce((sum, share) => sum + share, 0) !== OWNERSHIP_SHARE_TOTAL) {
    return { ok: false, error: "sharesMismatch" }
  }

  const amounts = splitByShares(total, shares)
  return {
    ok: true,
    parts: units
      .map((unit, index) => ({ unitId: unit._id, amount: amounts[index] }))
      // A unit that holds no share owes nothing.
      .filter((part) => part.amount > 0),
  }
}

// Sets the budget and due day from a month on. Months whose fees were already
// generated keep what they were generated with, so the settings cannot start
// in or before one of them.
export async function saveFeeSetting(
  input: unknown
): Promise<SaveFeeSettingResult> {
  const admin = await requireAdmin()

  const parsed = feeSettingInputSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: "invalid" }
  }

  const { effectiveFrom } = parsed.data
  const generated = await chargesCollection().findOne({
    kind: "regular",
    period: { $gte: effectiveFrom },
  })
  if (generated) {
    return { ok: false, error: "feesGenerated" }
  }

  try {
    const { _id, ...setting } = feeSettingSchema.parse({
      _id: new ObjectId(),
      ...parsed.data,
    })
    // Saving again for the same month replaces what was entered for it.
    const before = await feeSettingsCollection().findOne({ effectiveFrom })
    await feeSettingsCollection().updateOne(
      { effectiveFrom },
      { $set: setting, $setOnInsert: { _id } },
      { upsert: true }
    )
    await recordAudit({
      actorId: admin._id,
      action: before ? "update" : "create",
      collection: "feeSettings",
      documentId: before?._id ?? _id,
      before,
      after: { _id: before?._id ?? _id, ...setting },
    })
  } catch (saveError) {
    console.error("Saving the fee settings failed", saveError)
    return { ok: false, error: "saveFailed" }
  }

  refresh()
  return { ok: true }
}

// Creates a month's charge for every unit that does not have it yet, so
// running it twice for the same month adds nothing the second time.
export async function generateFees(
  input: unknown
): Promise<GenerateFeesResult> {
  const admin = await requireAdmin()

  const parsed = periodSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: "invalid" }
  }
  const period = parsed.data

  const settings = await feeSettingsCollection().find().toArray()
  const setting = findFeeSetting(settings, period)
  if (!setting) {
    return { ok: false, error: "noSettings" }
  }

  const split = await splitBetweenUnits(setting.monthlyBudget)
  if (!split.ok) {
    return split
  }

  const charges = chargesCollection()
  const existing = await charges
    .find({ kind: "regular", period })
    .project<{ unitId: ObjectId }>({ unitId: 1 })
    .toArray()
  const charged = new Set(existing.map((charge) => charge.unitId.toHexString()))

  try {
    const dueDate = periodDate(period, setting.dueDay)
    const missing = split.parts
      .filter((part) => !charged.has(part.unitId.toHexString()))
      .map((part) =>
        chargeSchema.parse({
          _id: new ObjectId(),
          unitId: part.unitId,
          kind: "regular",
          period,
          specialAssessmentId: null,
          amount: part.amount,
          paidAmount: 0,
          dueDate,
          status: "open",
        })
      )

    if (missing.length > 0) {
      await charges.insertMany(missing)
      await recordAudit(
        missing.map((charge) => ({
          actorId: admin._id,
          action: "create" as const,
          collection: "charges" as const,
          documentId: charge._id,
          after: charge,
        }))
      )
      // A unit that had paid in advance has its credit applied at once.
      await applyCredit()
    }

    refresh()
    return { ok: true, created: missing.length }
  } catch (saveError) {
    console.error("Generating the fees failed", saveError)
    // Some charges may have been written before the failure.
    refresh()
    return { ok: false, error: "saveFailed" }
  }
}

// Creates a special assessment and every unit's charge for it.
export async function createSpecialAssessment(
  input: unknown
): Promise<CreateSpecialAssessmentResult> {
  const admin = await requireAdmin()

  const parsed = specialAssessmentInputSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: "invalid" }
  }

  const split = await splitBetweenUnits(parsed.data.total)
  if (!split.ok) {
    return split
  }

  const assessments = specialAssessmentsCollection()
  const charges = chargesCollection()
  const assessmentId = new ObjectId()

  try {
    const dueDate = new Date(`${parsed.data.dueDate}T00:00:00Z`)
    const assessment = specialAssessmentSchema.parse({
      _id: assessmentId,
      description: parsed.data.description,
      total: parsed.data.total,
      dueDate,
      createdBy: admin._id,
      createdAt: new Date(),
    })
    const unitCharges = split.parts.map((part) =>
      chargeSchema.parse({
        _id: new ObjectId(),
        unitId: part.unitId,
        kind: "special",
        period: null,
        specialAssessmentId: assessmentId,
        amount: part.amount,
        paidAmount: 0,
        dueDate,
        status: "open",
      })
    )

    await assessments.insertOne(assessment)
    await charges.insertMany(unitCharges)
    await recordAudit({
      actorId: admin._id,
      action: "create",
      collection: "specialAssessments",
      documentId: assessmentId,
      after: assessment,
    })
  } catch (saveError) {
    // An assessment without all its charges would undercharge: undo it.
    console.error("Saving the special assessment failed", saveError)
    await charges.deleteMany({ specialAssessmentId: assessmentId })
    await assessments.deleteOne({ _id: assessmentId })
    return { ok: false, error: "saveFailed" }
  }

  // A unit that had paid in advance has its credit applied at once.
  await applyCredit()

  refresh()
  return { ok: true }
}
