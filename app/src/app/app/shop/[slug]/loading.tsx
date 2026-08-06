import { Skeleton } from "@/components/states";

export default function Loading() {
  return (
    <div className="max-w-[720px] px-4 sm:px-6 xl:px-8 py-6">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="aspect-square mt-4" />
      <Skeleton className="h-3 w-14 mt-5" />
      <Skeleton className="h-7 w-56 mt-2" />
      <Skeleton className="h-4 w-24 mt-2" />
      <Skeleton className="h-12 w-full mt-4" />
    </div>
  );
}
