import { Skeleton } from "@/components/states";

export default function Loading() {
  return (
    <div className="px-4 sm:px-6 xl:px-8 py-6 max-w-[880px]">
      <Skeleton className="h-3 w-12" />
      <Skeleton className="h-7 w-40 mt-2" />
      <Skeleton className="h-4 w-[60%] mt-3" />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-6">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="aspect-square" />
        ))}
      </div>
    </div>
  );
}
