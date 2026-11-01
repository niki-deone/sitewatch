// src/components/page-header.tsx
import type { ReactNode } from "react";

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: ReactNode; title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow ? <div className="mb-2 text-[12.5px] text-ink-3">{eyebrow}</div> : null}
        <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.02em] sm:text-[30px]">{title}</h1>
        {description ? <div className="mt-1.5 max-w-2xl text-[14px] text-ink-2">{description}</div> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function StatTile({ label, value, sub, tone = "default" }: { label: string; value: ReactNode; sub?: ReactNode; tone?: "default" | "up" | "down" | "degraded" }) {
  const toneClass = { default: "text-ink", up: "text-up", down: "text-down", degraded: "text-degraded" }[tone];
  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-surface p-4 shadow-card sm:p-5">
      <div className="text-[12.5px] font-medium text-ink-3">{label}</div>
      <div className={`mt-2 font-mono text-[24px] font-semibold leading-none tracking-tight tabular sm:text-[28px] ${toneClass}`}>{value}</div>
      {sub ? <div className="mt-2 text-[12px] text-ink-3">{sub}</div> : null}
    </div>
  );
}
