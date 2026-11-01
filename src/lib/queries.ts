// src/lib/queries.ts
// Read-side queries. Aggregations happen in Postgres so pages never pull thousands of raw rows.
import "server-only";
import { and, asc, count, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import type { CheckStatus, Monitor, MonitorStatus } from "@/db/schema";

export type DayBucket = { day: string; total: number; ok: number; degraded: number };

export type Range = "24h" | "7d" | "30d";

export const rangeConfig: Record<Range, { interval: string; bucket: string; label: string }> = {
  "24h": { interval: "24 hours", bucket: "10 minutes", label: "Last 24 hours" },
  "7d": { interval: "7 days", bucket: "1 hour", label: "Last 7 days" },
  "30d": { interval: "30 days", bucket: "4 hours", label: "Last 30 days" },
};

export function parseRange(value: string | string[] | undefined): Range {
  return value === "7d" || value === "30d" ? value : "24h";
}

/** Fills missing days so every bar chart always has exactly `days` bars, oldest first. */
export function fillDays(rows: DayBucket[], days: number, now = new Date()): DayBucket[] {
  const byDay = new Map(rows.map((row) => [row.day, row]));
  const result: DayBucket[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i));
    const key = date.toISOString().slice(0, 10);
    result.push(byDay.get(key) ?? { day: key, total: 0, ok: 0, degraded: 0 });
  }
  return result;
}

export function uptimePercent(buckets: Array<{ total: number; ok: number }>): number | null {
  const total = buckets.reduce((sum, bucket) => sum + bucket.total, 0);
  if (total === 0) return null;
  const ok = buckets.reduce((sum, bucket) => sum + bucket.ok, 0);
  return (ok / total) * 100;
}

async function dailyBuckets(monitorIds: string[], days: number) {
  if (monitorIds.length === 0) return new Map<string, DayBucket[]>();
  const rows = await db
    .select({
      monitorId: schema.checks.monitorId,
      day: sql<string>`to_char(date_trunc('day', ${schema.checks.checkedAt} at time zone 'UTC'), 'YYYY-MM-DD')`,
      total: sql<number>`count(*)::int`,
      ok: sql<number>`(count(*) filter (where ${schema.checks.status} <> 'down'))::int`,
      degraded: sql<number>`(count(*) filter (where ${schema.checks.status} = 'degraded'))::int`,
    })
    .from(schema.checks)
    .where(
      and(
        inArray(schema.checks.monitorId, monitorIds),
        sql`${schema.checks.checkedAt} > now() - make_interval(days => ${days})`,
      ),
    )
    .groupBy(schema.checks.monitorId, sql`2`);

  const grouped = new Map<string, DayBucket[]>();
  for (const row of rows) {
    const list = grouped.get(row.monitorId) ?? [];
    list.push({ day: row.day, total: row.total, ok: row.ok, degraded: row.degraded });
    grouped.set(row.monitorId, list);
  }
  return grouped;
}

async function hourlyLatency(monitorIds: string[]) {
  if (monitorIds.length === 0) return new Map<string, number[]>();
  const rows = await db
    .select({
      monitorId: schema.checks.monitorId,
      hour: sql<string>`date_trunc('hour', ${schema.checks.checkedAt})`,
      avg: sql<number>`round(avg(${schema.checks.latencyMs}))::int`,
    })
    .from(schema.checks)
    .where(and(inArray(schema.checks.monitorId, monitorIds), sql`${schema.checks.checkedAt} > now() - interval '24 hours'`))
    .groupBy(schema.checks.monitorId, sql`2`)
    .orderBy(sql`2`);
  const grouped = new Map<string, number[]>();
  for (const row of rows) {
    if (row.avg === null) continue;
    const list = grouped.get(row.monitorId) ?? [];
    list.push(row.avg);
    grouped.set(row.monitorId, list);
  }
  return grouped;
}

export type MonitorSummary = Monitor & {
  days: DayBucket[];
  uptime30d: number | null;
  sparkline: number[];
  openIncident: boolean;
};

export async function getWorkspaceOverview(workspaceId: string) {
  const monitorRows = await db.query.monitors.findMany({
    where: eq(schema.monitors.workspaceId, workspaceId),
    orderBy: [asc(schema.monitors.createdAt)],
  });
  const ids = monitorRows.map((monitor) => monitor.id);

  const [days, sparks, openIncidents, avgLatency] = await Promise.all([
    dailyBuckets(ids, 30),
    hourlyLatency(ids),
    db
      .select({ monitorId: schema.incidents.monitorId })
      .from(schema.incidents)
      .where(and(eq(schema.incidents.workspaceId, workspaceId), isNull(schema.incidents.resolvedAt))),
    ids.length
      ? db
          .select({ avg: sql<number | null>`round(avg(${schema.checks.latencyMs}))::int` })
          .from(schema.checks)
          .where(and(inArray(schema.checks.monitorId, ids), sql`${schema.checks.checkedAt} > now() - interval '24 hours'`))
      : Promise.resolve([{ avg: null }]),
  ]);

  const openSet = new Set(openIncidents.map((row) => row.monitorId));
  const monitors: MonitorSummary[] = monitorRows.map((monitor) => {
    const filled = fillDays(days.get(monitor.id) ?? [], 30);
    return {
      ...monitor,
      days: filled,
      uptime30d: uptimePercent(filled),
      sparkline: sparks.get(monitor.id) ?? [],
      openIncident: openSet.has(monitor.id),
    };
  });

  const allDays = monitors.flatMap((monitor) => monitor.days);
  const counts: Record<MonitorStatus, number> = { up: 0, degraded: 0, down: 0, pending: 0 };
  for (const monitor of monitors) {
    if (!monitor.paused) counts[monitor.status] += 1;
  }

  return {
    monitors,
    counts,
    paused: monitors.filter((monitor) => monitor.paused).length,
    uptime30d: uptimePercent(allDays),
    avgLatency24h: avgLatency[0]?.avg ?? null,
    openIncidents: openIncidents.length,
  };
}

export type LatencyPoint = { t: string; avg: number | null; max: number | null; worst: CheckStatus; total: number };

export async function getMonitorDetail(monitorId: string, range: Range) {
  const config = rangeConfig[range];

  const [points, uptimeRows, recentChecks, monitorIncidents, days90] = await Promise.all([
    db.execute<{ t: string; avg: number | null; max: number | null; worst: CheckStatus; total: number }>(sql`
      select
        date_bin(${config.bucket}::interval, checked_at, timestamptz '2000-01-01') as t,
        round(avg(latency_ms))::int as avg,
        max(latency_ms)::int as max,
        case
          when bool_or(status = 'down') then 'down'
          when bool_or(status = 'degraded') then 'degraded'
          else 'up'
        end as worst,
        count(*)::int as total
      from checks
      where monitor_id = ${monitorId}
        and checked_at > now() - ${config.interval}::interval
      group by 1
      order by 1
    `),
    db.execute<{ label: string; total: number; ok: number }>(sql`
      select w.label, count(c.id)::int as total, (count(c.id) filter (where c.status <> 'down'))::int as ok
      from (values ('24h', interval '24 hours'), ('7d', interval '7 days'), ('30d', interval '30 days'), ('90d', interval '90 days')) as w(label, span)
      left join checks c on c.monitor_id = ${monitorId} and c.checked_at > now() - w.span
      group by w.label
    `),
    db
      .select()
      .from(schema.checks)
      .where(eq(schema.checks.monitorId, monitorId))
      .orderBy(desc(schema.checks.checkedAt))
      .limit(15),
    db
      .select()
      .from(schema.incidents)
      .where(eq(schema.incidents.monitorId, monitorId))
      .orderBy(desc(schema.incidents.startedAt))
      .limit(10),
    dailyBuckets([monitorId], 90),
  ]);

  const uptime: Record<string, number | null> = {};
  for (const row of uptimeRows.rows) {
    uptime[row.label] = row.total > 0 ? (row.ok / row.total) * 100 : null;
  }

  const latencies = points.rows.map((point) => point.avg).filter((value): value is number => value !== null);
  const sorted = [...latencies].sort((a, b) => a - b);
  const p95 = sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))] : null;
  const avg = latencies.length ? Math.round(latencies.reduce((sum, value) => sum + value, 0) / latencies.length) : null;

  return {
    points: points.rows.map((point) => ({ ...point, t: new Date(point.t).toISOString() })) as LatencyPoint[],
    uptime,
    stats: { avg, p95, min: sorted[0] ?? null, max: sorted[sorted.length - 1] ?? null },
    recentChecks,
    incidents: monitorIncidents,
    days: fillDays(days90.get(monitorId) ?? [], 90),
  };
}

export async function listIncidents(workspaceId: string, limit = 50) {
  return db
    .select({
      id: schema.incidents.id,
      cause: schema.incidents.cause,
      startedAt: schema.incidents.startedAt,
      resolvedAt: schema.incidents.resolvedAt,
      monitorId: schema.monitors.id,
      monitorName: schema.monitors.name,
      monitorUrl: schema.monitors.url,
    })
    .from(schema.incidents)
    .innerJoin(schema.monitors, eq(schema.monitors.id, schema.incidents.monitorId))
    .where(eq(schema.incidents.workspaceId, workspaceId))
    .orderBy(desc(sql`${schema.incidents.resolvedAt} is null`), desc(schema.incidents.startedAt))
    .limit(limit);
}

export async function listMembers(workspaceId: string) {
  return db
    .select({
      userId: schema.users.id,
      name: schema.users.name,
      email: schema.users.email,
      image: schema.users.image,
      role: schema.memberships.role,
      joinedAt: schema.memberships.createdAt,
    })
    .from(schema.memberships)
    .innerJoin(schema.users, eq(schema.users.id, schema.memberships.userId))
    .where(eq(schema.memberships.workspaceId, workspaceId))
    .orderBy(asc(schema.memberships.createdAt));
}

export async function listActiveInvites(workspaceId: string) {
  return db
    .select()
    .from(schema.invites)
    .where(
      and(
        eq(schema.invites.workspaceId, workspaceId),
        isNull(schema.invites.usedAt),
        sql`${schema.invites.expiresAt} > now()`,
      ),
    )
    .orderBy(desc(schema.invites.createdAt));
}

export async function countMonitors(workspaceId: string) {
  const [row] = await db.select({ value: count() }).from(schema.monitors).where(eq(schema.monitors.workspaceId, workspaceId));
  return row?.value ?? 0;
}

export async function getPublicStatusPage(slug: string) {
  const workspace = await db.query.workspaces.findFirst({ where: eq(schema.workspaces.slug, slug) });
  if (!workspace || !workspace.statusPagePublic) return null;

  const monitorRows = await db.query.monitors.findMany({
    where: and(eq(schema.monitors.workspaceId, workspace.id), eq(schema.monitors.showOnStatusPage, true)),
    orderBy: [asc(schema.monitors.createdAt)],
  });
  const ids = monitorRows.map((monitor) => monitor.id);
  const days = await dailyBuckets(ids, 90);

  const recentIncidents = ids.length
    ? await db
        .select({
          id: schema.incidents.id,
          cause: schema.incidents.cause,
          startedAt: schema.incidents.startedAt,
          resolvedAt: schema.incidents.resolvedAt,
          monitorName: schema.monitors.name,
        })
        .from(schema.incidents)
        .innerJoin(schema.monitors, eq(schema.monitors.id, schema.incidents.monitorId))
        .where(and(inArray(schema.incidents.monitorId, ids), sql`${schema.incidents.startedAt} > now() - interval '14 days'`))
        .orderBy(desc(schema.incidents.startedAt))
        .limit(20)
    : [];

  return {
    workspace: { name: workspace.name, title: workspace.statusPageTitle || `${workspace.name} status`, slug: workspace.slug },
    monitors: monitorRows.map((monitor) => {
      const filled = fillDays(days.get(monitor.id) ?? [], 90);
      // Only expose what a public visitor needs: no URLs, keywords or internal settings.
      return {
        id: monitor.id,
        name: monitor.name,
        status: monitor.paused ? ("pending" as MonitorStatus) : monitor.status,
        days: filled,
        uptime90d: uptimePercent(filled),
      };
    }),
    incidents: recentIncidents,
  };
}
