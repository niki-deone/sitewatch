// src/app/app/[ws]/page.tsx
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowUpRight, PauseCircle, Plus, Radar } from "lucide-react";
import { requireWorkspace } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { getWorkspaceOverview, type MonitorSummary } from "@/lib/queries";
import { formatInterval, formatMs, formatPercent, hostOf, timeAgo } from "@/lib/format";
import { cx } from "@/lib/cx";
import { AutoRefresh } from "@/components/auto-refresh";
import { PageHeader, StatTile } from "@/components/page-header";
import { ButtonLink, Card, EmptyState, StatusDot, StatusPill } from "@/components/ui";
import { Sparkline } from "@/components/charts/sparkline";
import { UptimeBars } from "@/components/charts/uptime-bars";

export const metadata: Metadata = { title: "Overview" };

function headline(counts: { up: number; degraded: number; down: number; pending: number }, total: number) {
  if (total === 0) return { text: "No monitors yet", tone: "text-ink" };
  if (counts.down > 0) return { text: `${counts.down} ${counts.down === 1 ? "monitor is" : "monitors are"} down`, tone: "text-down" };
  if (counts.degraded > 0) return { text: `${counts.degraded} running slow`, tone: "text-degraded" };
  return { text: "All systems operational", tone: "text-up" };
}

export default async function OverviewPage({ params }: { params: Promise<{ ws: string }> }) {
  const { ws } = await params;
  const { workspace, role } = await requireWorkspace(ws);
  const overview = await getWorkspaceOverview(workspace.id);
  const canWrite = can(role, "monitor:write");
  const active = overview.monitors.length - overview.paused;
  const status = headline(overview.counts, active);

  return (
    <>
      <PageHeader
        eyebrow={<AutoRefresh seconds={60} />}
        title={<span className={status.tone}>{status.text}</span>}
        description={
          overview.monitors.length
            ? `${workspace.name} · ${overview.monitors.length} ${overview.monitors.length === 1 ? "monitor" : "monitors"}${overview.paused ? `, ${overview.paused} paused` : ""}`
            : "Add the first URL you care about. SiteWatch checks it every few minutes and tells you when it breaks."
        }
        actions={
          canWrite ? (
            <ButtonLink href={`/app/${workspace.slug}/monitors/new`}>
              <Plus className="size-4" aria-hidden /> New monitor
            </ButtonLink>
          ) : null
        }
      />

      {overview.monitors.length === 0 ? (
        <EmptyState
          icon={<Radar className="size-8 text-pen" aria-hidden />}
          title="Nothing is being watched yet"
          description="Create a monitor for your website, API or landing page. The first check runs immediately."
          action={
            canWrite ? (
              <ButtonLink href={`/app/${workspace.slug}/monitors/new`}>
                <Plus className="size-4" aria-hidden /> Create monitor
              </ButtonLink>
            ) : null
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile
              label="Operational"
              value={
                <>
                  {overview.counts.up + overview.counts.degraded}
                  <span className="text-ink-3">/{active}</span>
                </>
              }
              sub={overview.counts.degraded ? `${overview.counts.degraded} degraded` : "monitors responding"}
              tone={overview.counts.down ? "down" : "up"}
            />
            <StatTile label="Uptime, 30 days" value={formatPercent(overview.uptime30d)} sub="across all monitors" />
            <StatTile label="Avg response, 24h" value={formatMs(overview.avgLatency24h)} sub="mean of all checks" />
            <StatTile
              label="Open incidents"
              value={overview.openIncidents}
              sub={
                <Link href={`/app/${workspace.slug}/incidents`} className="text-pen hover:underline">
                  View incident log
                </Link>
              }
              tone={overview.openIncidents ? "down" : "default"}
            />
          </div>

          <Card className="mt-6 overflow-hidden">
            <div className="hidden grid-cols-[minmax(0,1.6fr)_140px_minmax(0,1.4fr)_110px] items-center gap-6 border-b border-line bg-surface-2 px-5 py-2.5 text-[11.5px] font-medium uppercase tracking-wider text-ink-3 md:grid">
              <span>Monitor</span>
              <span>Response, 24h</span>
              <span>Last 30 days</span>
              <span className="text-right">Uptime</span>
            </div>
            <ul className="divide-y divide-line">
              {overview.monitors.map((monitor, index) => (
                <MonitorRow key={monitor.id} monitor={monitor} slug={workspace.slug} index={index} />
              ))}
            </ul>
          </Card>
        </>
      )}
    </>
  );
}

function MonitorRow({ monitor, slug, index }: { monitor: MonitorSummary; slug: string; index: number }) {
  const status = monitor.paused ? "pending" : monitor.status;
  return (
    <li className="rise-in" style={{ animationDelay: `${index * 40}ms` }}>
      <Link
        href={`/app/${slug}/monitors/${monitor.id}`}
        className="group grid gap-3 px-5 py-4 transition-colors hover:bg-surface-2 md:grid-cols-[minmax(0,1.6fr)_140px_minmax(0,1.4fr)_110px] md:items-center md:gap-6"
      >
        <div className="flex min-w-0 items-center gap-3">
          {monitor.paused ? (
            <PauseCircle className="size-[18px] shrink-0 text-pending" aria-label="Paused" />
          ) : (
            <span className="grid size-[18px] place-items-center">
              <StatusDot status={status} size={9} live />
            </span>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate text-[14.5px] font-semibold">{monitor.name}</span>
              <ArrowUpRight className="size-3.5 shrink-0 text-ink-3 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12.5px] text-ink-3">
              <span className="truncate tabular">{hostOf(monitor.url)}</span>
              <span aria-hidden>·</span>
              <span>{monitor.paused ? "paused" : formatInterval(monitor.intervalSeconds)}</span>
              <span aria-hidden className="hidden sm:inline">·</span>
              <span className="hidden sm:inline">checked {timeAgo(monitor.lastCheckedAt)}</span>
            </div>
          </div>
          <div className="ml-auto md:hidden">
            <StatusPill status={status} label={monitor.paused ? "Paused" : undefined} />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Sparkline values={monitor.sparkline} status={status} width={88} height={28} />
          <span className="whitespace-nowrap tabular text-[12.5px] text-ink-2">{formatMs(monitor.lastLatencyMs)}</span>
        </div>

        <UptimeBars days={monitor.days} height={26} />

        <div className="flex items-center justify-between gap-2 md:justify-end">
          <span className="text-[12px] text-ink-3 md:hidden">30-day uptime</span>
          <span
            className={cx(
              "tabular text-[14px] font-semibold",
              monitor.uptime30d === null ? "text-ink-3" : monitor.uptime30d >= 99.9 ? "text-up" : monitor.uptime30d >= 99 ? "text-degraded" : "text-down",
            )}
          >
            {formatPercent(monitor.uptime30d)}
          </span>
        </div>
      </Link>
    </li>
  );
}
