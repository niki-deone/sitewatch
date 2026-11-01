// src/app/app/[ws]/monitors/[id]/page.tsx
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExternalLink, Pencil, ShieldAlert, ShieldCheck } from "lucide-react";
import { getWorkspaceMonitor, requireWorkspace } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { getMonitorDetail, parseRange, rangeConfig, type Range } from "@/lib/queries";
import { runMonitorNow, togglePause } from "@/lib/actions/monitors";
import { daysUntil, formatDateTime, formatInterval, formatMs, formatPercent, timeAgo } from "@/lib/format";
import { formatDuration } from "@/lib/monitoring/notify";
import { cx } from "@/lib/cx";
import { AutoRefresh } from "@/components/auto-refresh";
import { PageHeader } from "@/components/page-header";
import { ButtonLink, Card, CardHeader, StatusDot, StatusPill } from "@/components/ui";
import { LatencyChart } from "@/components/charts/latency-chart";
import { UptimeBars } from "@/components/charts/uptime-bars";
import { PauseButton, RunNowButton } from "@/components/monitor-actions";

export async function generateMetadata({ params }: { params: Promise<{ ws: string; id: string }> }): Promise<Metadata> {
  const { ws, id } = await params;
  const { workspace } = await requireWorkspace(ws);
  const monitor = await getWorkspaceMonitor(workspace.id, id);
  return { title: monitor?.name ?? "Monitor" };
}

const RANGES: Range[] = ["24h", "7d", "30d"];

export default async function MonitorPage({
  params,
  searchParams,
}: {
  params: Promise<{ ws: string; id: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  const { ws, id } = await params;
  const { range: rawRange } = await searchParams;
  const range = parseRange(rawRange);
  const { workspace, role } = await requireWorkspace(ws);
  const monitor = await getWorkspaceMonitor(workspace.id, id);
  if (!monitor) notFound();

  const detail = await getMonitorDetail(monitor.id, range);
  const base = `/app/${workspace.slug}/monitors/${monitor.id}`;
  const status = monitor.paused ? "pending" : monitor.status;
  const sslDays = daysUntil(monitor.sslExpiresAt);
  const openIncident = detail.incidents.find((incident) => !incident.resolvedAt);

  return (
    <>
      <PageHeader
        eyebrow={
          <span className="flex flex-wrap items-center gap-3">
            <Link href={`/app/${workspace.slug}`} className="hover:text-ink">
              ← Overview
            </Link>
            <AutoRefresh seconds={60} />
          </span>
        }
        title={
          <span className="flex flex-wrap items-center gap-3">
            <StatusDot status={status} size={12} live />
            {monitor.name}
          </span>
        }
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <a href={monitor.url} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 tabular text-[13px] text-pen hover:underline">
              {monitor.url}
              <ExternalLink className="size-3.5" aria-hidden />
            </a>
            <StatusPill status={status} label={monitor.paused ? "Paused" : undefined} />
          </span>
        }
        actions={
          can(role, "monitor:write") ? (
            <>
              <RunNowButton action={runMonitorNow.bind(null, workspace.slug, monitor.id)} />
              <PauseButton action={togglePause.bind(null, workspace.slug, monitor.id)} paused={monitor.paused} />
              <ButtonLink href={`${base}/edit`} variant="secondary">
                <Pencil className="size-4" aria-hidden /> Edit
              </ButtonLink>
            </>
          ) : null
        }
      />

      {openIncident ? (
        <div role="alert" className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-[var(--radius-card)] border border-down/40 bg-down-soft px-4 py-3 text-[13.5px] text-down">
          <span className="font-semibold">Ongoing incident for {formatDuration(new Date().getTime() - openIncident.startedAt.getTime())}</span>
          <span className="text-ink-2">{openIncident.cause}</span>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {(["24h", "7d", "30d", "90d"] as const).map((window) => {
          const value = detail.uptime[window] ?? null;
          return (
            <div key={window} className="rounded-[var(--radius-card)] border border-line bg-surface p-4 shadow-card">
              <div className="text-[12.5px] font-medium text-ink-3">Uptime {window}</div>
              <div
                className={cx(
                  "mt-2 tabular text-[22px] font-semibold",
                  value === null ? "text-ink-3" : value >= 99.9 ? "text-up" : value >= 99 ? "text-degraded" : "text-down",
                )}
              >
                {formatPercent(value, 3)}
              </div>
            </div>
          );
        })}
      </div>

      <Card className="mt-6">
        <CardHeader
          title="Response time"
          description={rangeConfig[range].label}
          action={
            <div role="tablist" aria-label="Time range" className="flex rounded-[var(--radius-ctl)] border border-line bg-surface-2 p-0.5">
              {RANGES.map((option) => (
                <Link
                  key={option}
                  role="tab"
                  aria-selected={option === range}
                  href={option === "24h" ? base : `${base}?range=${option}`}
                  scroll={false}
                  className={cx(
                    "rounded-md px-3 py-1 tabular text-[12px] transition-colors",
                    option === range ? "bg-surface text-ink shadow-card" : "text-ink-3 hover:text-ink",
                  )}
                >
                  {option}
                </Link>
              ))}
            </div>
          }
        />
        <div className="px-3 pb-3 pt-4 sm:px-5">
          <LatencyChart points={detail.points} range={range} />
        </div>
        <dl className="grid grid-cols-2 border-t border-line sm:grid-cols-4">
          {[
            ["Average", detail.stats.avg],
            ["p95", detail.stats.p95],
            ["Fastest", detail.stats.min],
            ["Slowest", detail.stats.max],
          ].map(([label, value], index) => (
            <div key={label as string} className={cx("px-5 py-3", index > 0 && "sm:border-l sm:border-line", index % 2 === 1 && "border-l border-line")}>
              <dt className="text-[12px] text-ink-3">{label}</dt>
              <dd className="tabular text-[15px] font-semibold">{formatMs(value as number | null)}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader title="90-day history" description="Each bar is one day. Hover for details." />
          <div className="p-5">
            <UptimeBars days={detail.days} height={40} showLegend />
          </div>
        </Card>

        <Card>
          <CardHeader title="Configuration" />
          <dl className="grid gap-3 p-5 text-[13.5px]">
            <Row label="Interval" value={monitor.paused ? "Paused" : formatInterval(monitor.intervalSeconds)} />
            <Row label="Method" value={<span className="tabular">{monitor.method}</span>} />
            <Row label="Expects" value={<span className="tabular">{monitor.expectedStatus ?? "2xx / 3xx"}</span>} />
            <Row label="Keyword" value={monitor.keyword ? <span className="tabular">&ldquo;{monitor.keyword}&rdquo;</span> : "none"} />
            <Row label="Timeout" value={`${monitor.timeoutMs / 1000} s`} />
            <Row label="Slow above" value={formatMs(monitor.degradedThresholdMs)} />
            <Row label="Last check" value={timeAgo(monitor.lastCheckedAt)} />
            <Row
              label="SSL"
              value={
                sslDays === null ? (
                  <span className="text-ink-3">{monitor.url.startsWith("https") ? "not checked yet" : "no TLS"}</span>
                ) : (
                  <span className={cx("inline-flex items-center gap-1.5", sslDays < 14 ? "text-down" : sslDays < 30 ? "text-degraded" : "text-up")}>
                    {sslDays < 14 ? <ShieldAlert className="size-4" aria-hidden /> : <ShieldCheck className="size-4" aria-hidden />}
                    {sslDays < 0 ? "expired" : `expires in ${sslDays} days`}
                  </span>
                )
              }
            />
          </dl>
        </Card>
      </div>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader title="Recent checks" description="Newest first" />
          {detail.recentChecks.length === 0 ? (
            <p className="p-5 text-sm text-ink-3">No checks yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead className="bg-surface-2 text-left text-[11.5px] uppercase tracking-wider text-ink-3">
                  <tr>
                    <th className="px-5 py-2 font-medium">Time (UTC)</th>
                    <th className="px-3 py-2 font-medium">Result</th>
                    <th className="px-3 py-2 text-right font-medium">Code</th>
                    <th className="px-5 py-2 text-right font-medium">Latency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {detail.recentChecks.map((check) => (
                    <tr key={check.id} className="align-top">
                      <td className="whitespace-nowrap px-5 py-2.5 tabular text-ink-2">{formatDateTime(check.checkedAt)}</td>
                      <td className="px-3 py-2.5">
                        <StatusPill status={check.status} label={check.status === "up" ? "Up" : undefined} />
                        {check.error ? <div className="mt-1 max-w-[260px] text-[12px] text-ink-3">{check.error}</div> : null}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular">{check.statusCode ?? "n/a"}</td>
                      <td className="whitespace-nowrap px-5 py-2.5 text-right tabular">{formatMs(check.latencyMs)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Incidents" description="An incident opens after a failed check and its retry." />
          {detail.incidents.length === 0 ? (
            <p className="p-5 text-sm text-ink-3">No incidents recorded. Nice.</p>
          ) : (
            <ol className="relative grid gap-0 p-5">
              {detail.incidents.map((incident) => {
                const end = incident.resolvedAt ?? new Date();
                return (
                  <li key={incident.id} className="relative border-l border-line pb-5 pl-5 last:pb-0">
                    <span
                      className={cx("absolute -left-[5px] top-1 size-[9px] rounded-full ring-4 ring-surface", incident.resolvedAt ? "bg-up" : "bg-down")}
                      aria-hidden
                    />
                    <div className="flex flex-wrap items-center gap-2 text-[13.5px] font-medium">
                      {incident.resolvedAt ? "Resolved" : "Ongoing"}
                      <span className="tabular text-[12px] font-normal text-ink-3">{formatDuration(end.getTime() - incident.startedAt.getTime())}</span>
                    </div>
                    <div className="mt-0.5 text-[13px] text-ink-2">{incident.cause}</div>
                    <div className="mt-0.5 tabular text-[11.5px] text-ink-3">{formatDateTime(incident.startedAt)}</div>
                  </li>
                );
              })}
            </ol>
          )}
        </Card>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-dashed border-line pb-2.5 last:border-0 last:pb-0">
      <dt className="text-ink-3">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}
