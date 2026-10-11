"use server"

import { cookies } from "next/headers"

import { getCurrentUser } from "@/lib/current-user"
import { usersCollection } from "@/models/user"
import { isLocale, localeCookieName } from "./config"

// Sets the interface language. With `remember`, a signed-in user's choice is
// also saved on their account, so it follows them to other devices.
export async function setLocale(locale: string, remember = true) {
  if (!isLocale(locale)) {
    return
  }

  const store = await cookies()
  store.set(localeCookieName, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  })

  if (remember) {
    const currentUser = await getCurrentUser()
    if (currentUser?.profile) {
      await usersCollection().updateOne(
        { _id: currentUser.profile._id },
        { $set: { language: locale, updatedAt: new Date() } }
      )
    }
  }
}
