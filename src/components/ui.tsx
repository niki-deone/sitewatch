// src/components/ui.tsx
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cx } from "@/lib/cx";
import type { MonitorStatus } from "@/db/schema";

type Variant = "primary" | "secondary" | "soft" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-[var(--radius-ctl)] font-medium whitespace-nowrap transition-[background-color,border-color,color,transform,box-shadow] duration-150 active:translate-y-px disabled:pointer-events-none disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary: "bg-pen text-white hover:bg-pen-hover",
  secondary: "bg-surface text-ink border border-line-strong hover:bg-surface-2",
  soft: "bg-pen-soft text-pen hover:bg-pen-soft/60",
  ghost: "text-ink-2 hover:text-ink hover:bg-surface-2",
  danger: "bg-surface text-down border border-line hover:border-down hover:bg-down-soft",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px]",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-[15.5px]",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cx(base, variants[variant], sizes[size], className);
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cx("rounded-[var(--radius-card)] border border-line bg-surface", className)} {...props} />;
}

export function CardHeader({ title, description, action }: { title: ReactNode; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
        {description ? <p className="mt-0.5 text-[13px] text-ink-3">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

const statusLabel: Record<MonitorStatus, string> = {
  up: "Operational",
  degraded: "Degraded",
  down: "Down",
  pending: "Pending",
};

const statusText: Record<MonitorStatus, string> = {
  up: "text-up",
  degraded: "text-degraded",
  down: "text-down",
  pending: "text-pending",
};

const statusBg: Record<MonitorStatus, string> = {
  up: "bg-up-soft",
  degraded: "bg-degraded-soft",
  down: "bg-down-soft",
  pending: "bg-surface-2",
};

export function StatusDot({ status, size = 8, live = false }: { status: MonitorStatus; size?: number; live?: boolean }) {
  return (
    <span
      aria-hidden
      className={cx("relative inline-block shrink-0 rounded-full bg-current", statusText[status], live && status !== "pending" && "status-ping")}
      style={{ width: size, height: size }}
    />
  );
}

export function StatusPill({ status, label }: { status: MonitorStatus; label?: string }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-medium",
        statusText[status],
        statusBg[status],
      )}
    >
      <StatusDot status={status} size={6} />
      {label ?? statusLabel[status]}
    </span>
  );
}

export { statusLabel, statusText };

export function Field({ label, hint, error, htmlFor, children }: { label: string; hint?: ReactNode; error?: string; htmlFor: string; children: ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor={htmlFor} className="text-[13px] font-medium text-ink">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-[12px] text-down" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-[12px] text-ink-3">{hint}</p>
      ) : null}
    </div>
  );
}

const controlClass =
  "h-10 w-full rounded-[var(--radius-ctl)] border border-line bg-surface px-3 text-sm text-ink placeholder:text-ink-3 transition-colors hover:border-line-strong focus:border-pen focus:outline-none focus:ring-2 focus:ring-pen/20 disabled:opacity-60 aria-[invalid=true]:border-down";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cx(controlClass, className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cx(controlClass, "appearance-none bg-[length:16px] bg-[right_10px_center] bg-no-repeat pr-9", className)} style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none' stroke='%2366766f' stroke-width='1.5'%3E%3Cpath d='M4 6l4 4 4-4'/%3E%3C/svg%3E\")" }} {...props} />;
}

export function Checkbox({ label, description, ...props }: ComponentProps<"input"> & { label: string; description?: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-[var(--radius-ctl)] border border-line bg-surface p-3 transition-colors hover:border-line-strong has-[:checked]:border-pen has-[:checked]:bg-pen-soft/40">
      <input type="checkbox" className="mt-0.5 size-4 accent-[var(--pen)]" {...props} />
      <span className="grid gap-0.5">
        <span className="text-[13px] font-medium">{label}</span>
        {description ? <span className="text-[12px] text-ink-3">{description}</span> : null}
      </span>
    </label>
  );
}

export function EmptyState({ title, description, action, icon }: { title: string; description: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="graph-paper flex flex-col items-center justify-center rounded-[var(--radius-card)] border border-dashed border-line-strong px-6 py-14 text-center">
      {icon}
      <h3 className="mt-3 text-base font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-ink-3">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="rounded border border-line bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] text-ink-2">{children}</kbd>;
}
