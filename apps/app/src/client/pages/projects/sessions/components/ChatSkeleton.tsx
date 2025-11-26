/**
 * Loading skeleton for chat interface
 */

import { Skeleton } from "@/client/components/ui/skeleton";

export function ChatSkeleton() {
  return (
    <div className="space-y-6 p-4 max-w-4xl mx-auto">
      {/* Skeleton for user message (right-aligned) */}
      <div className="flex justify-end">
        <div className="space-y-2 w-3/4">
          <Skeleton className="h-4 w-1/4 ml-auto" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>

      {/* Skeleton for assistant message (left-aligned) */}
      <div className="flex gap-3">
        <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-24 w-5/6" />
        </div>
      </div>

      {/* Another assistant message */}
      <div className="flex gap-3">
        <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    </div>
  );
}
