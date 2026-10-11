import { Suspense } from "react"

import { FeeSettings } from "./fee-settings"
import { FeesSectionSkeleton } from "./fees-section"
import { FeesStats, FeesStatsSkeleton } from "./fees-stats"
import { MonthlyFees } from "./monthly-fees"
import { SpecialAssessments } from "./special-assessments"

export default function FeesPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
      <Suspense fallback={<FeesStatsSkeleton />}>
        <FeesStats />
      </Suspense>
      <Suspense fallback={<FeesSectionSkeleton />}>
        <FeeSettings />
      </Suspense>
      <Suspense fallback={<FeesSectionSkeleton />}>
        <MonthlyFees />
      </Suspense>
      <Suspense fallback={<FeesSectionSkeleton />}>
        <SpecialAssessments />
      </Suspense>
    </div>
  )
}
