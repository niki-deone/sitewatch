// src/components/landing/product-window.tsx
"use client";

import { motion, useReducedMotion } from "motion/react";
import { Globe, LayoutGrid, Settings, Siren } from "lucide-react";
import { RecorderTrace } from "./recorder-trace";

type Tone = "up" | "degraded" | "down";

// Deterministic 30-day strips for the mock rows: no randomness, so server and client render the same.
function strip(failDays: number[], slowDays: number[] = []): Tone[] {
  return Array.from({ length: 30 }, (_, day) => (failDays.includes(day) ? "down" : slowDays.includes(day) ? "degraded" : "up"));
}

const rows: Array<{ name: string; host: string; ms: string; uptime: string; status: Tone; days: Tone[] }> = [
  { name: "Marketing site", host: "acme.com", ms: "118 ms", uptime: "99.98%", status: "up", days: strip([11]) },
  { name: "Public API", host: "api.acme.com", ms: "203 ms", uptime: "99.94%", status: "up", days: strip([], [21, 22]) },
  { name: "Billing", host: "billing.acme.com", ms: "503", uptime: "99.41%", status: "down", days: strip([29]) },
];

const toneBg: Record<Tone, string> = { up: "bg-up", degraded: "bg-degraded", down: "bg-down" };
const toneText: Record<Tone, string> = { up: "text-up", degraded: "text-degraded", down: "text-down" };

export function ProductWindow() {
  const reduce = useReducedMotion();

  return (
    <div className="relative">
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, delay: 0.2, ease: [0.2, 0.7, 0.2, 1] }}
        className="overflow-hidden rounded-[14px] bg-surface shadow-window"
      >
        {/* Window chrome */}
        <div className="flex items-center gap-3 border-b border-line bg-surface-2 px-4 py-2.5">
          <div className="flex gap-1.5" aria-hidden>
            <span className="size-2.5 rounded-full bg-line-strong" />
            <span className="size-2.5 rounded-full bg-line-strong" />
            <span className="size-2.5 rounded-full bg-line-strong" />
          </div>
          <div className="mx-auto rounded-md bg-surface px-3 py-0.5 text-[11.5px] text-ink-3">sitewatch.app/acme</div>
          <div className="w-[42px]" aria-hidden />
        </div>

        <div className="grid md:grid-cols-[200px_1fr]">
          {/* Sidebar */}
          <aside className="hidden border-r border-line bg-surface-2 p-3 md:block" aria-hidden>
            <div className="mb-4 flex items-center gap-2 px-1.5 py-1">
              <span className="grid size-6 place-items-center rounded-md bg-pen-soft text-[11px] font-bold text-pen">A</span>
              <span className="text-[13px] font-semibold">Acme Inc</span>
            </div>
            {[
              { label: "Overview", icon: LayoutGrid, active: true },
              { label: "Incidents", icon: Siren, badge: "1" },
              { label: "Settings", icon: Settings },
              { label: "Status page", icon: Globe },
            ].map((item) => (
              <div
                key={item.label}
                className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-[12.5px] ${item.active ? "bg-surface-3 font-medium text-ink" : "text-ink-2"}`}
              >
                <item.icon className="size-3.5 text-ink-3" strokeWidth={1.8} />
                {item.label}
                {item.badge ? <span className="ml-auto rounded-full bg-down px-1.5 text-[10px] font-semibold leading-4 text-white">{item.badge}</span> : null}
              </div>
            ))}
          </aside>

          {/* Main */}
          <div className="min-w-0 p-4 sm:p-6">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <p className="text-[11.5px] text-ink-3">Acme Inc · 3 monitors</p>
                <p className="mt-0.5 text-[20px] font-bold tracking-[-0.03em] text-down sm:text-[22px]">1 monitor is down</p>
              </div>
              <span className="rounded-md bg-pen px-2.5 py-1 text-[11.5px] font-medium text-white">New monitor</span>
            </div>

            <div className="mt-4 rounded-[10px] border border-line">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-2.5">
                <span className="text-[12.5px] font-semibold">api.acme.com · response time</span>
                <span className="font-mono text-[11px] text-ink-3">p95 412 ms · 30d 99.94%</span>
              </div>
              <div className="px-3 pb-3 pt-10 sm:px-4">
                <RecorderTrace className="h-[130px] w-full sm:h-[170px]" />
              </div>
            </div>

            <ul className="mt-4 divide-y divide-line rounded-[10px] border border-line">
              {rows.map((row) => (
                <li key={row.host} className="grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-2.5 sm:grid-cols-[1.2fr_1.4fr_auto]">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className={`size-2 shrink-0 rounded-full ${toneBg[row.status]}`} aria-hidden />
                    <div className="min-w-0">
                      <div className="truncate text-[12.5px] font-semibold">{row.name}</div>
                      <div className="truncate font-mono text-[10.5px] text-ink-3">{row.host}</div>
                    </div>
                  </div>
                  <div className="hidden h-5 items-end gap-[2px] sm:flex" aria-hidden>
                    {row.days.map((tone, index) => (
                      <span key={index} className={`h-full flex-1 rounded-[1.5px] ${toneBg[tone]}`} />
                    ))}
                  </div>
                  <div className="text-right">
                    <div className={`font-mono text-[11.5px] font-semibold tabular ${row.status === "down" ? "text-down" : "text-ink"}`}>{row.ms}</div>
                    <div className={`text-[10.5px] ${toneText[row.status === "down" ? "down" : "up"]}`}>{row.uptime}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </motion.div>

      {/* The moment SiteWatch earns its keep: the alert in your team chat. */}
      <motion.div
        initial={reduce ? false : { opacity: 0, x: -24, y: 12 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ delay: 1.3, duration: 0.6, ease: [0.2, 0.7, 0.2, 1] }}
        className="absolute -bottom-20 -left-8 hidden w-[300px] rounded-[12px] border border-line bg-surface p-4 shadow-pop lg:block"
      >
        <div className="flex items-center gap-2 text-[11.5px] text-ink-3">
          <span className="grid size-5 place-items-center rounded bg-[#4a154b] text-[10px] font-bold text-white">#</span>
          ops-alerts · now
        </div>
        <p className="mt-2 text-[13px] leading-snug">
          <span className="font-semibold text-down">billing.acme.com is down</span>
          <br />
          <span className="text-ink-2">Expected 2xx, got 503. Checked twice.</span>
        </p>
      </motion.div>

      <motion.div
        initial={reduce ? false : { opacity: 0, x: 24, y: -12 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ delay: 1.6, duration: 0.6, ease: [0.2, 0.7, 0.2, 1] }}
        className="absolute -right-8 bottom-40 hidden w-[220px] rounded-[12px] border border-line bg-surface p-4 shadow-pop lg:block"
      >
        <p className="text-[11.5px] text-ink-3">SSL certificate</p>
        <p className="mt-1 text-[22px] font-bold tracking-[-0.03em] text-degraded">21 days left</p>
        <p className="mt-0.5 text-[12px] text-ink-2">shop.acme.com</p>
      </motion.div>
    </div>
  );
}
