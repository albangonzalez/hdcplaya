"use server"

import { createClient } from "@supabase/supabase-js"
import { z } from "zod"

export type RequestPasswordResetResult =
  | { ok: true }
  | { ok: false; error: "invalid" | "rateLimited" | "failed" }

const emailSchema = z.email().toLowerCase()

// Asks Supabase to e-mail a password-reset link. It is sent from the server
// with a plain client rather than the browser one: the browser client uses
// PKCE, whose links only work in the browser that asked for them, while these
// carry the tokens in the URL fragment that /auth/confirm reads.
export async function requestPasswordReset(
  input: unknown
): Promise<RequestPasswordResetResult> {
  const parsed = emailSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: "invalid" }
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // No redirect URL is passed: the link goes to the Site URL set in Supabase.
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data)

  // Supabase reports success for an unknown address too, so the answer does
  // not reveal who has an account.
  if (error) {
    if (error.code === "over_email_send_rate_limit") {
      return { ok: false, error: "rateLimited" }
    }
    console.error("Password reset request failed", error)
    return { ok: false, error: "failed" }
  }

  return { ok: true }
}
