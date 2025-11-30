/**
 * Loading skeleton for spec preview page
 */

import { Skeleton } from "@/client/components/ui/skeleton";

export function SpecPreviewSkeleton() {
  return (
    <div className="flex h-full flex-col">
      {/* Header skeleton */}
      <div className="border-b bg-background px-4 py-4">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 md:gap-4">
          <div className="flex items-center gap-3 flex-wrap min-w-0">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-9" />
          </div>
        </div>
        <Skeleton className="h-4 w-32 mt-2" />
      </div>

      {/* Split-pane Layout */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 overflow-hidden">
        {/* Main Content Area */}
        <div className="md:col-span-2 flex flex-col overflow-hidden border-r">
          {/* Tab bar skeleton */}
          <div className="border-b px-6 py-3 flex items-center justify-between">
            <Skeleton className="h-9 w-44" />
          </div>

          {/* Content skeleton */}
          <div className="flex-1 p-6 space-y-4">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/5" />
            <div className="pt-4">
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-4 w-full mt-2" />
              <Skeleton className="h-4 w-11/12 mt-1" />
              <Skeleton className="h-4 w-3/4 mt-1" />
            </div>
            <div className="pt-4">
              <Skeleton className="h-5 w-1/4" />
              <Skeleton className="h-32 w-full mt-2" />
            </div>
          </div>
        </div>

        {/* Sidebar skeleton */}
        <div className="hidden md:flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div>
              <Skeleton className="h-4 w-16 mb-3" />
              <div className="space-y-2">
                <div className="flex gap-3">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <div className="flex gap-3">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <div className="flex gap-3">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
            </div>
            <div>
              <Skeleton className="h-4 w-16 mb-3" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div>
              <Skeleton className="h-4 w-12 mb-3" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
