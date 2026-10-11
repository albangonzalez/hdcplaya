import { Suspense } from "react"

import { TableSkeleton } from "@/components/table-skeleton"
import { CategoriesTable } from "./categories-table"
import { AddCategoryButton } from "./category-dialog"

export default function CategoriesPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
      <div className="flex justify-end">
        <AddCategoryButton />
      </div>
      <Suspense fallback={<TableSkeleton />}>
        <CategoriesTable />
      </Suspense>
    </div>
  )
}
