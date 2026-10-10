import { z } from "zod"

import { getCollection } from "@/lib/mongodb"
import { nameSchema, objectIdSchema } from "./shared"

export const userRoleSchema = z.enum(["owner", "admin"])
export const userStatusSchema = z.enum(["invited", "active", "deactivated"])
export const languageSchema = z.enum(["es", "en"])

export const userSchema = z
  .object({
    _id: objectIdSchema,
    // Set when the invitation is sent; a Supabase user without a document has no access.
    supabaseUserId: z.uuid(),
    email: z.email().toLowerCase(),
    firstName: nameSchema,
    firstLastName: nameSchema,
    secondLastName: nameSchema.nullable(),
    role: userRoleSchema,
    isCommittee: z.boolean(),
    language: languageSchema,
    status: userStatusSchema,
    createdAt: z.date(),
    updatedAt: z.date(),
  })
  .refine((user) => !user.isCommittee || user.role === "owner", {
    path: ["isCommittee"],
    error: "Only an owner can be a committee member",
  })

export type User = z.infer<typeof userSchema>

// What the admin enters; the rest of the document is set by the server.
export const userInputSchema = z
  .object({
    email: z.email().toLowerCase(),
    firstName: nameSchema,
    firstLastName: nameSchema,
    secondLastName: nameSchema.nullable(),
    role: userRoleSchema,
    isCommittee: z.boolean(),
    language: languageSchema,
  })
  .refine((user) => !user.isCommittee || user.role === "owner", {
    path: ["isCommittee"],
    error: "Only an owner can be a committee member",
  })

export type UserInput = z.infer<typeof userInputSchema>

export const usersCollection = () => getCollection<User>("users")
