// src/components/logo.tsx
import Link from "next/link";
import { cx } from "@/lib/cx";

export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden className={className}>
      <rect x="1" y="1" width="30" height="30" rx="8" fill="var(--ink)" />
      <path d="M1 16h30M16 1v30" stroke="var(--paper)" strokeOpacity="0.12" />
      <path
        d="M4.5 18h5.5l2.2-6.5 3.6 11 3-14.5 2.6 10H27.5"
        stroke="var(--paper)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="27.5" cy="18" r="2" fill="var(--up)" />
    </svg>
  );
}

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cx("inline-flex items-center gap-2.5 rounded-md", className)} aria-label="SiteWatch home">
      <LogoMark />
      <span className="text-[17px] font-semibold tracking-tight">SiteWatch</span>
    </Link>
  );
}
