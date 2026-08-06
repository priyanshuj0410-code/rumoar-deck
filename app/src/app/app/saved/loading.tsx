import { Skeleton } from "@/components/states";

export default function Loading() {
  return (
    <div className="px-4 sm:px-6 xl:px-8 py-6 max-w-[880px]">
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
