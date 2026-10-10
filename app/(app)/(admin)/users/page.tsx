import { Suspense } from "react"

import { AddUserButton } from "./add-user-button"
import { UsersStats, UsersStatsSkeleton } from "./users-stats"
import { UsersTable } from "./users-table"
import { UsersTableSkeleton } from "./users-table-skeleton"

export default function UsersPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
      <Suspense fallback={<UsersStatsSkeleton />}>
        <UsersStats />
      </Suspense>
      <div className="flex justify-end">
        <AddUserButton />
      </div>
      <Suspense fallback={<UsersTableSkeleton />}>
        <UsersTable />
      </Suspense>
    </div>
  )
}
