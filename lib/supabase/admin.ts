import { createClient } from "@supabase/supabase-js"

// Uses the secret key, which bypasses every access rule: server code only,
// and only after the caller has been checked to be an admin.
export function createAdminClient() {
  const secretKey = process.env.SUPABASE_SECRET_KEY
  if (!secretKey) {
    throw new Error("SUPABASE_SECRET_KEY is not set")
  }

  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
