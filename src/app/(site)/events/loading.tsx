import { TableSkeleton } from "@/components/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-14">
      <TableSkeleton title rows={6} />
    </div>
  );
}
