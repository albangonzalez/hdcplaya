import { Skeleton } from "@/components/ui/skeleton"

export function PaymentsTableSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="h-10 bg-muted" />
      {Array.from({ length: 5 }, (_, index) => (
        <div
          key={index}
          className="flex h-12 items-center gap-4 border-t px-2"
        >
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="ml-auto h-4 w-24" />
          <Skeleton className="size-8" />
        </div>
      ))}
    </div>
  )
}
