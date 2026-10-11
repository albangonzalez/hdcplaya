import { Suspense } from "react"

import { UnitsStats, UnitsStatsSkeleton } from "./units-stats"
import { UnitsTable } from "./units-table"
import { UnitsTableSkeleton } from "./units-table-skeleton"

export default function UnitsPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
      <Suspense fallback={<UnitsStatsSkeleton />}>
        <UnitsStats />
      </Suspense>
      <Suspense fallback={<UnitsTableSkeleton />}>
        <UnitsTable />
      </Suspense>
    </div>
  )
}
