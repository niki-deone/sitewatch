// src/app/page.tsx
export default function Home() {
  return (
    <main className="relative z-10 mx-auto max-w-3xl px-6 py-24">
      <p className="tabular text-sm uppercase tracking-[0.2em] text-ink-faint">
        Design tokens check
      </p>

      <h1 className="mt-4 text-5xl font-semibold tracking-tight">
        SiteWatch
      </h1>

      <p className="mt-3 max-w-md text-ink-soft">
        Continuous health monitoring for the sites you maintain.
      </p>

      <div className="mt-12 rounded-panel border border-line bg-surface p-8">
        <p className="tabular text-xs uppercase tracking-[0.2em] text-ink-faint">
          Overall score
        </p>

        <div className="mt-2 flex items-baseline gap-3">
          <span className="tabular text-7xl font-medium text-ink">72</span>
          <span className="tabular text-lg text-ink-faint">/ 100</span>
        </div>

        <div className="mt-8 flex gap-3">
          <span className="rounded-chip bg-surface-2 px-3 py-1.5 text-sm text-pass">
            SSL valid
          </span>
          <span className="rounded-chip bg-surface-2 px-3 py-1.5 text-sm text-warn">
            LCP 3.4s
          </span>
          <span className="rounded-chip bg-surface-2 px-3 py-1.5 text-sm text-fail">
            No CSP header
          </span>
        </div>
      </div>
    </main>
  );
}