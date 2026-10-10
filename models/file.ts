import { z } from "zod"

import { getCollection } from "@/lib/mongodb"
import { objectIdSchema } from "./shared"

// Metadata only; the bytes are in the private S3 bucket under s3Key.
export const fileSchema = z.object({
  _id: objectIdSchema,
  s3Key: z.string().min(1),
  originalName: z.string().trim().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.int().positive(),
  // Restricted files (e.g. payslips) are for the committee and the admin only.
  restricted: z.boolean(),
  attachedTo: z.object({
    type: z.enum(["transaction", "payment"]),
    id: objectIdSchema,
  }),
  uploadedBy: objectIdSchema,
  uploadedAt: z.date(),
})

export type File = z.infer<typeof fileSchema>

export const filesCollection = () => getCollection<File>("files")
