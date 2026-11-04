import { Skeleton } from "@/components/ui/skeleton";

/** The shape of a page: a title, then cards. */
export default function Loading() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4" aria-busy="true">
      <Skeleton className="h-9 w-2/3 rounded-xl" />
      <Skeleton className="h-44 w-full rounded-2xl" />
      <Skeleton className="h-36 w-full rounded-2xl" />
    </div>
  );
}
