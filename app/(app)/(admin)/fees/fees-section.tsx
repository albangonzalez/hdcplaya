import { Skeleton } from "@/components/ui/skeleton"

// A titled block of the fees page, with its button on the right.
export function FeesSection({
  title,
  action,
  children,
}: {
  title: string
  action: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">{title}</h2>
        {action}
      </div>
      <div className="overflow-hidden rounded-lg border">{children}</div>
    </section>
  )
}

export function FeesSectionSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-8 w-28" />
      </div>
      <div className="overflow-hidden rounded-lg border">
        <div className="h-10 bg-muted" />
        {Array.from({ length: 3 }, (_, index) => (
          <div
            key={index}
            className="flex h-12 items-center gap-4 border-t px-2"
          >
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
    </div>
  )
}
