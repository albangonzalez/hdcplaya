import { redirect } from "next/navigation"

import { LocaleSwitcher } from "@/components/locale-switcher"
import { SetPasswordForm } from "@/components/set-password-form"
import { createClient } from "@/lib/supabase/server"
import { GalleryVerticalEndIcon } from "lucide-react"
import Image from "next/image"

// Reached from an invitation or a password-reset e-mail, once the link has
// opened a session.
export default async function SetPasswordPage() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()

  if (!data?.claims) {
    redirect("/login")
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex items-center justify-between gap-2">
          <a href="#" className="flex items-center gap-2 font-medium">
            <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <GalleryVerticalEndIcon className="size-4" />
            </div>
            Hacienda del Carmen Playa
          </a>
          <LocaleSwitcher />
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <SetPasswordForm />
          </div>
        </div>
      </div>
      <div className="relative hidden bg-muted lg:block">
        <Image
          src="/images/hdc-splash.jpg"
          alt="Hacienda del Carmen Playa"
          fill
          sizes="(min-width: 1024px) 50vw, 0px"
          className="object-cover dark:brightness-[0.2] dark:grayscale"
        />
      </div>
    </div>
  )
}
