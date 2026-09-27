import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-10 w-2/3 bg-secondary" />
      <Skeleton className="h-14 w-full rounded-2xl bg-secondary" />
      {[0, 1].map((s) => (
        <div key={s} className="space-y-2">
          <Skeleton className="h-8 w-40 bg-secondary" />
          {[0, 1, 2].map((r) => (
            <Skeleton key={r} className="h-20 w-full rounded-2xl bg-secondary" />
          ))}
        </div>
      ))}
    </div>
  );
}