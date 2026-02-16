'use client';

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded bg-gray-200 dark:bg-gray-700 ${className}`} aria-hidden="true" />
  );
}

export function NewsCardSkeleton() {
  return (
    <div className="bg-white dark:bg-[#17212b] rounded-2xl border border-gray-100 dark:border-[#242f3d] overflow-hidden">
      <Skeleton className="aspect-video md:aspect-[16/10] w-full" />
      <div className="p-4 md:p-5 space-y-3">
        <div className="flex gap-2">
          <Skeleton className="h-3 w-16 rounded" />
          <Skeleton className="h-3 w-24 rounded" />
        </div>
        <Skeleton className="h-5 w-full rounded" />
        <Skeleton className="h-4 w-4/5 rounded" />
        <Skeleton className="h-3 w-1/3 rounded" />
      </div>
    </div>
  );
}

export function ChatItemSkeleton() {
  return (
    <div className="p-3 flex items-center gap-3">
      <Skeleton className="w-12 h-12 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-24 rounded" />
        <Skeleton className="h-3 w-full rounded" />
      </div>
    </div>
  );
}
