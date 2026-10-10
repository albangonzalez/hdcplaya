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

export type SpecialAssessment = z.infer<typeof specialAssessmentSchema>

export const specialAssessmentsCollection = () =>
  getCollection<SpecialAssessment>("specialAssessments")
