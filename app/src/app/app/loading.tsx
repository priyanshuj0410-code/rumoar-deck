import { Skeleton } from "@/components/states";

/** Holds the shape of the Today screen so navigation never lands on blank paper. */
export default function Loading() {
  return (
    <div className="px-6 mx-auto @2xl:px-8 @4xl:px-10 py-8 @4xl:py-12 max-w-[1120px]">
      <Skeleton className="h-3 w-14" />
      <Skeleton className="h-9 w-52 mt-3" />
      <Skeleton className="h-4 w-[70%] mt-4" />
      <div className="flex gap-3 mt-6">
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-9 w-24" />
      </div>
      <Skeleton className="h-6 w-32 mt-12" />
      <div className="grid gap-3 @xl:grid-cols-2 @4xl:grid-cols-3 mt-4">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="aspect-[4/5]" />
        ))}
      </div>
    </div>
  );
}
