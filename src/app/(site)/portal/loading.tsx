import { TileSkeleton, TableSkeleton } from "@/components/skeleton";

export default function Loading() {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <TileSkeleton />
        <TableSkeleton rows={5} />
      </div>
      <TableSkeleton rows={5} />
    </div>
  );
}
