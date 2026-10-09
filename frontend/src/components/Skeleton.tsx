const Bar = ({ className }: { className: string }) => (
  <div className={`animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800 ${className}`} />
);

export const TodoSkeleton = () => (
  <div className="card flex gap-4 p-5" aria-hidden>
    <Bar className="h-5 w-5 shrink-0 rounded-md" />
    <div className="flex-1 space-y-3">
      <Bar className="h-4 w-2/5" />
      <Bar className="h-3 w-4/5" />
      <div className="flex gap-2">
        <Bar className="h-5 w-16 rounded-full" />
        <Bar className="h-5 w-20 rounded-full" />
      </div>
    </div>
  </div>
);

export const TodoListSkeleton = ({ count = 4 }: { count?: number }) => (
  <div className="space-y-3" aria-busy="true">
    {Array.from({ length: count }, (_, i) => (
      <TodoSkeleton key={i} />
    ))}
  </div>
);
