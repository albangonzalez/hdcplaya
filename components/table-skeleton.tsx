import { Skeleton } from "@/components/ui/skeleton"

// Placeholder for a bordered table while its rows load.
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="h-10 bg-muted" />
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          className="flex h-12 items-center gap-4 border-t px-2"
        >
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="ml-auto h-4 w-20" />
        </div>
      ))}
    </div>
  )
}
