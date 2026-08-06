import { Skeleton } from "@/components/states";

export default function Loading() {
  return (
    <div className="px-4 mx-auto @lg:px-6 @4xl:px-10 py-6 @4xl:py-10 max-w-[1120px]">
      <Skeleton className="h-3 w-12" />
      <Skeleton className="h-7 w-40 mt-2" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 mt-8">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="aspect-[4/5]" />
        ))}
      </div>
    </div>
  );
}
