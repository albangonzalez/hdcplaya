import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"

// Session checks for the pages outside the app shell. They render nothing and
// wait for the request, so each is used inside <Suspense>: the page shows at
// once and the redirect follows if it applies.

async function hasSession() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  return Boolean(data?.claims)
}

export async function RedirectIfSignedIn() {
  if (await hasSession()) {
    redirect("/")
  }
  return null
}

export async function RedirectIfSignedOut() {
  if (!(await hasSession())) {
    redirect("/login")
  }
  return null
}
