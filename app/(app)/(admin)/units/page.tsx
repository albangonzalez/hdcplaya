import { Suspense } from "react"

import { Skeleton } from "@/components/ui/skeleton"
import { condoToday } from "@/lib/condo-time"
import { getOwnerOptions } from "@/lib/data/units"
import { AddUnitButton } from "./unit-row-actions"
import { UnitsStats, UnitsStatsSkeleton } from "./units-stats"
import { UnitsTable } from "./units-table"
import { UnitsTableSkeleton } from "./units-table-skeleton"

export default function UnitsPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
      <Suspense fallback={<UnitsStatsSkeleton />}>
        <UnitsStats />
      </Suspense>
      <div className="flex justify-end">
        <Suspense fallback={<Skeleton className="h-8 w-36" />}>
          <AddUnit />
        </Suspense>
      </div>
      <Suspense fallback={<UnitsTableSkeleton />}>
        <UnitsTable />
      </Suspense>
    </div>
  )
}

// The button needs the owners a unit can be given to.
async function AddUnit() {
  const ownerOptions = await getOwnerOptions()
  return <AddUnitButton ownerOptions={ownerOptions} today={condoToday()} />
}
