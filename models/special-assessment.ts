import { z } from "zod"

import { getCollection } from "@/lib/mongodb"
import { objectIdSchema, positiveAmountSchema } from "./shared"

export const specialAssessmentSchema = z.object({
  _id: objectIdSchema,
  description: z.string().trim().min(1),
  total: positiveAmountSchema,
  dueDate: z.date(),
  createdBy: objectIdSchema,
  createdAt: z.date(),
})

// What the admin enters; the due date is a calendar date, "YYYY-MM-DD".
export const specialAssessmentInputSchema = z.object({
  description: z.string().trim().min(1),
  total: positiveAmountSchema,
  dueDate: z.iso.date(),
})

export type SpecialAssessment = z.infer<typeof specialAssessmentSchema>

export const specialAssessmentsCollection = () =>
  getCollection<SpecialAssessment>("specialAssessments")
