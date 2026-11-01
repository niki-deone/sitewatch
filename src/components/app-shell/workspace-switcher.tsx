// src/components/app-shell/workspace-switcher.tsx
"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cx } from "@/lib/cx";
import { roleLabels } from "@/lib/permissions";
import type { Role } from "@/db/schema";

type WorkspaceItem = { slug: string; name: string; role: Role };

export function WorkspaceSwitcher({ current, workspaces, canCreate }: { current: WorkspaceItem; workspaces: WorkspaceItem[]; canCreate: boolean }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-2.5 rounded-[var(--radius-ctl)] px-2 py-2 text-left transition-colors hover:bg-surface-3/70"
      >
        <span className="grid size-7 shrink-0 place-items-center rounded-md bg-pen-soft font-mono text-[12px] font-semibold text-pen">
          {current.name.slice(0, 1).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13.5px] font-semibold">{current.name}</span>
          <span className="block text-[11.5px] text-ink-3">{roleLabels[current.role]}</span>
        </span>
        <ChevronsUpDown className="size-4 text-ink-3" aria-hidden />
      </button>

      {open ? (
        <div role="menu" className="rise-in absolute left-0 right-0 top-full z-40 mt-1.5 overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface p-1 shadow-pop">
          <p className="px-2.5 pb-1 pt-1.5 text-[11px] font-medium uppercase tracking-wider text-ink-3">Workspaces</p>
          {workspaces.map((workspace) => (
            <Link
              key={workspace.slug}
              role="menuitem"
              href={`/app/${workspace.slug}`}
              onClick={() => setOpen(false)}
              className={cx(
                "flex items-center gap-2 rounded-md px-2.5 py-2 text-[13.5px] hover:bg-surface-2",
                workspace.slug === current.slug && "font-medium",
              )}
            >
              <span className="min-w-0 flex-1 truncate">{workspace.name}</span>
              {workspace.slug === current.slug ? <Check className="size-4 text-pen" aria-hidden /> : null}
            </Link>
          ))}
          {canCreate ? (
            <>
              <div className="my-1 h-px bg-line" />
              <Link
                role="menuitem"
                href="/app/new"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-md px-2.5 py-2 text-[13.5px] text-ink-2 hover:bg-surface-2 hover:text-ink"
              >
                <Plus className="size-4" aria-hidden />
                New workspace
              </Link>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
