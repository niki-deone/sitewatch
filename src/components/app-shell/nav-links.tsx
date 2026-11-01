// src/components/app-shell/nav-links.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, LayoutGrid, Settings, Siren } from "lucide-react";
import { cx } from "@/lib/cx";

export function NavLinks({ slug, openIncidents, orientation = "vertical" }: { slug: string; openIncidents: number; orientation?: "vertical" | "horizontal" }) {
  const pathname = usePathname();
  const base = `/app/${slug}`;
  const links = [
    { href: base, label: "Overview", icon: LayoutGrid, match: (path: string) => path === base || (path.startsWith(`${base}/monitors/`) && !path.endsWith("/new")) },
    { href: `${base}/monitors/new`, label: "New monitor", icon: Activity, match: (path: string) => path === `${base}/monitors/new` },
    { href: `${base}/incidents`, label: "Incidents", icon: Siren, match: (path: string) => path.startsWith(`${base}/incidents`), badge: openIncidents },
    { href: `${base}/settings`, label: "Settings", icon: Settings, match: (path: string) => path.startsWith(`${base}/settings`) },
  ];

  return (
    <nav aria-label="Workspace" className={cx(orientation === "vertical" ? "grid gap-0.5" : "flex gap-1 overflow-x-auto")}>
      {links.map((link) => {
        const active = link.match(pathname);
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cx(
              "group flex items-center gap-2.5 rounded-[var(--radius-ctl)] px-2.5 text-[13.5px] font-medium transition-colors",
              orientation === "vertical" ? "h-9" : "h-9 shrink-0",
              active ? "bg-surface-3 text-ink" : "text-ink-2 hover:bg-surface-3/70 hover:text-ink",
            )}
          >
            <Icon className={cx("size-4", active ? "text-pen" : "text-ink-3 group-hover:text-ink-2")} strokeWidth={1.8} aria-hidden />
            <span>{link.label}</span>
            {link.badge ? (
              <span className="ml-auto rounded-full bg-down px-1.5 font-mono text-[11px] leading-5 text-white tabular">{link.badge}</span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
