"use client"

import { EllipsisVerticalIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export type RowAction = {
  label: string
  onClick: () => void
  variant?: "default" | "destructive"
  disabled?: boolean
}

// The "⋮" menu at the end of a table row.
export function RowActions({
  label,
  actions,
}: {
  // Screen-reader name of the trigger.
  label: string
  actions: RowAction[]
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            className="flex size-8 text-muted-foreground data-open:bg-muted"
            size="icon"
          />
        }
      >
        <EllipsisVerticalIcon />
        <span className="sr-only">{label}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {actions.map((action) => (
          <DropdownMenuItem
            key={action.label}
            variant={action.variant}
            disabled={action.disabled}
            onClick={action.onClick}
          >
            {action.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
