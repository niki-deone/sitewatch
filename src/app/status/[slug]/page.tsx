// src/app/status/[slug]/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { getPublicStatusPage } from "@/lib/queries";
import { formatDateTime, formatPercent } from "@/lib/format";
import { formatDuration } from "@/lib/monitoring/notify";
import { cx } from "@/lib/cx";
import { LogoMark } from "@/components/logo";
import { StatusPill } from "@/components/ui";
import { UptimeBars } from "@/components/charts/uptime-bars";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPublicStatusPage(slug);
  return page ? { title: page.workspace.title, description: `Live status and uptime history for ${page.workspace.name}.` } : { title: "Status page not found" };
}

export default async function PublicStatusPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await getPublicStatusPage(slug);
  if (!page) notFound();

  const down = page.monitors.filter((monitor) => monitor.status === "down").length;
  const degraded = page.monitors.filter((monitor) => monitor.status === "degraded").length;
  const banner =
    down > 0
      ? { icon: XCircle, text: down === page.monitors.length ? "Major outage" : "Partial outage", className: "bg-down text-white" }
      : degraded > 0
        ? { icon: AlertTriangle, text: "Degraded performance", className: "bg-degraded text-white" }
        : { icon: CheckCircle2, text: "All systems operational", className: "bg-up text-white" };
  const BannerIcon = banner.icon;

  return (
    <main className="graph-paper min-h-dvh">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
        <header className="mb-8 flex items-center justify-between gap-4">
          <h1 className="text-[24px] font-semibold tracking-tight sm:text-[28px]">{page.workspace.title}</h1>
          <span className="font-mono text-[12px] text-ink-3">updated every minute</span>
        </header>

        <div className={cx("rise-in flex items-center gap-3 rounded-[var(--radius-card)] px-5 py-4 shadow-card", banner.className)}>
          <BannerIcon className="size-6" aria-hidden />
          <span className="text-[17px] font-semibold">{banner.text}</span>
        </div>

        <section className="mt-8 overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface shadow-card">
          {page.monitors.length === 0 ? (
            <p className="p-6 text-sm text-ink-3">No services are listed on this status page yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {page.monitors.map((monitor) => (
                <li key={monitor.id} className="px-5 py-5">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[15px] font-semibold">{monitor.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[12.5px] text-ink-3 tabular">{formatPercent(monitor.uptime90d, 2)} uptime</span>
                      <StatusPill status={monitor.status} label={monitor.status === "pending" ? "Not monitored" : undefined} />
                    </div>
                  </div>
                  <UptimeBars days={monitor.days} height={34} />
                  <div className="mt-1.5 flex justify-between font-mono text-[11px] text-ink-3">
                    <span>90 days ago</span>
                    <span>Today</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-10">
          <h2 className="text-[16px] font-semibold">Past 14 days</h2>
          {page.incidents.length === 0 ? (
            <p className="mt-3 text-[14px] text-ink-3">No incidents reported.</p>
          ) : (
            <ul className="mt-4 grid gap-3">
              {page.incidents.map((incident) => (
                <li key={incident.id} className="rounded-[var(--radius-card)] border border-line bg-surface p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[14px] font-semibold">{incident.monitorName} {incident.resolvedAt ? "was unavailable" : "is unavailable"}</span>
                    <StatusPill status={incident.resolvedAt ? "up" : "down"} label={incident.resolvedAt ? "Resolved" : "Investigating"} />
                  </div>
                  <p className="mt-1 font-mono text-[12px] text-ink-3">
                    {formatDateTime(incident.startedAt)} · {incident.resolvedAt ? "lasted" : "ongoing for"} {formatDuration((incident.resolvedAt ?? new Date()).getTime() - incident.startedAt.getTime())}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <footer className="mt-16 flex items-center justify-center gap-2 text-[12.5px] text-ink-3">
          <LogoMark size={18} />
          Powered by{" "}
          <Link href="/" className="font-medium text-ink-2 hover:text-ink">
            SiteWatch
          </Link>
        </footer>
      </div>
    </main>
  );
}
