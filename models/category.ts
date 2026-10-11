import { z } from "zod"

import { getCollection } from "@/lib/mongodb"
import { objectIdSchema } from "./shared"

export const categoryKindSchema = z.enum(["income", "expense"])

export const categorySchema = z.object({
  _id: objectIdSchema,
  kind: categoryKindSchema,
  name: z.object({
    es: z.string().trim().min(1),
    en: z.string().trim().min(1),
  }),
  active: z.boolean(),
  // Set on a category the app itself uses: "fees" is the income category of
  // the transactions created by recorded payments. Null for the others.
  system: z.enum(["fees"]).nullable(),
})

export type Category = z.infer<typeof categorySchema>

export const categoriesCollection = () =>
  getCollection<Category>("categories")
