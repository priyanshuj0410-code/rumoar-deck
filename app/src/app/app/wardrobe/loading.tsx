import { Skeleton } from "@/components/states";

export default function Loading() {
  return (
    <div className="px-4 sm:px-6 xl:px-8 py-6 max-w-[880px]">
      <div className="flex items-end justify-between gap-4">
        <div>
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-7 w-24 mt-2" />
        </div>
        <Skeleton className="h-9 w-20" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5 mt-6">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="aspect-[4/5]" />
        ))}
      </div>
    </div>
  );
}
