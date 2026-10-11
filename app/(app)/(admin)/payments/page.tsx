import { Suspense } from "react"

import { Skeleton } from "@/components/ui/skeleton"
import { getPaymentFormData } from "@/lib/data/payments"
import { PaymentsStats, PaymentsStatsSkeleton } from "./payments-stats"
import { PaymentsTable } from "./payments-table"
import { PaymentsTableSkeleton } from "./payments-table-skeleton"
import { RecordPaymentDialog } from "./record-payment-dialog"

export default function PaymentsPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
      <Suspense fallback={<PaymentsStatsSkeleton />}>
        <PaymentsStats />
      </Suspense>
      <div className="flex justify-end">
        <Suspense fallback={<Skeleton className="h-8 w-36" />}>
          <RecordPayment />
        </Suspense>
      </div>
      <Suspense fallback={<PaymentsTableSkeleton />}>
        <PaymentsTable />
      </Suspense>
    </div>
  )
}

// The button needs the units, their unpaid charges and the accounts.
async function RecordPayment() {
  return <RecordPaymentDialog {...await getPaymentFormData()} />
}
