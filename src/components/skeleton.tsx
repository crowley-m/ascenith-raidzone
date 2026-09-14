/** Generic pulsing placeholder block — compose into page-shaped skeletons. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-sm bg-edge/60 ${className}`} />;
}

/** A titled list of row-shaped placeholders — the shape most portal/public list pages share. */
export function TableSkeleton({ title = false, rows = 8 }: { title?: boolean; rows?: number }) {
  return (
    <div>
      {title && <Skeleton className="h-6 w-48" />}
      <div className={`space-y-2 ${title ? "mt-5" : ""}`}>
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-11 w-full" />
        ))}
      </div>
    </div>
  );
}

/** Stat-tile grid — the shape the Portal Overview and similar dashboards share. */
export function TileSkeleton({ tiles = 6 }: { tiles?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      {Array.from({ length: tiles }).map((_, i) => (
        <Skeleton key={i} className="h-20 w-full" />
      ))}
    </div>
  );
}
