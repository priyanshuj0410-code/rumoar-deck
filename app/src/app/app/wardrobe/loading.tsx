import { Skeleton } from "@/components/states";

export default function Loading() {
  return (
    <div className="px-4 mx-auto @lg:px-6 @4xl:px-10 py-6 @4xl:py-10 max-w-[1120px]">
      <div className="flex items-end justify-between gap-4">
        <div>
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-7 w-24 mt-2" />
        </div>
        <Skeleton className="h-9 w-20" />
      </div>
      <div className="grid grid-cols-2 @2xl:grid-cols-3 @4xl:grid-cols-4 @6xl:grid-cols-5 gap-2.5 @4xl:gap-4 mt-6">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="aspect-[4/5]" />
        ))}
      </div>
    </div>
  );
}
