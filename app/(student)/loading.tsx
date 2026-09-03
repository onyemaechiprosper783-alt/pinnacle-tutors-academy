export default function StudentLoading() {
  return (
    <div className="mx-auto max-w-7xl animate-pulse space-y-4" aria-label="Loading">
      <div className="h-32 rounded-[24px] bg-[var(--card)] ring-1 ring-[var(--border)]" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[1, 2, 3, 4].map((item) => <div key={item} className="h-28 rounded-2xl bg-[var(--card)] ring-1 ring-[var(--border)]" />)}
      </div>
      <div className="h-24 rounded-[24px] bg-[var(--card)] ring-1 ring-[var(--border)]" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[1, 2, 3, 4, 5, 6].map((item) => <div key={item} className="h-32 rounded-2xl bg-[var(--card)] ring-1 ring-[var(--border)]" />)}
      </div>
    </div>
  );
}
