// src/app/app/[ws]/loading.tsx
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading" className="animate-pulse">
      <div className="mb-3 h-3 w-24 rounded bg-line" />
      <div className="mb-8 h-8 w-72 max-w-full rounded bg-line" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-[104px] rounded-[var(--radius-card)] border border-line bg-surface" />
        ))}
      </div>
      <div className="mt-6 h-[320px] rounded-[var(--radius-card)] border border-line bg-surface" />
    </div>
  );
}
