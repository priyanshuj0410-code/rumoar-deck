import { Skeleton } from "@/components/states";

export default function Loading() {
  return (
    <div className="px-4 mx-auto @lg:px-6 @4xl:px-10 py-6 @4xl:py-10 max-w-[620px]">
      <Skeleton className="h-3 w-16" />
      <Skeleton className="h-7 w-40 mt-2" />
      <div className="mt-8 flex flex-col gap-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-10" />
        ))}
      </div>
    </div>
  );
}
