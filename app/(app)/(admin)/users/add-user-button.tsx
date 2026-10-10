"use client"

import { useState } from "react"
import { PlusIcon } from "lucide-react"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"
import { UserFormDialog } from "./user-form-dialog"

export function AddUserButton() {
  const t = useTranslations("Users")
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <PlusIcon />
        {t("add")}
      </Button>
      <UserFormDialog open={open} onOpenChange={setOpen} />
    </>
  )
}
