import { Skeleton } from "@/components/states";

export default function Loading() {
  return (
    <div className="max-w-[980px] px-4 mx-auto @lg:px-6 @4xl:px-10 py-6 @4xl:py-10">
      <Skeleton className="h-4 w-20" />
      <div className="mt-4 @3xl:grid @3xl:grid-cols-2 @3xl:gap-x-12 @3xl:items-start">
        <Skeleton className="aspect-square" />
        <div className="mt-5 @3xl:mt-0">
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-7 w-56 mt-2" />
          <Skeleton className="h-4 w-24 mt-2" />
          <Skeleton className="h-12 w-full @3xl:max-w-[280px] mt-4" />
        </div>
      </div>
    </div>
  );
}
