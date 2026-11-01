// src/lib/monitoring/runner.ts
// Orchestrates checks: claims due monitors, runs them, stores results, opens and resolves incidents.
import "server-only";
import { and, eq, isNull, lt, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import type { Monitor } from "@/db/schema";
import { runHttpCheckWithRetry, type CheckResult } from "./checker";
import { sendWebhook } from "./notify";
import { getCertificateExpiry } from "./ssl";

const SSL_RECHECK_MS = 12 * 60 * 60 * 1000;
const RETENTION_DAYS = 90;
const BATCH_CONCURRENCY = 8;

export function appUrl(): string | undefined {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return undefined;
}

/**
 * Atomically claims monitors that are due. `FOR UPDATE SKIP LOCKED` plus bumping last_checked_at
 * means two overlapping cron runs never check the same monitor twice.
 */
async function claimDueMonitors(limit: number): Promise<Monitor[]> {
  const result = await db.execute<{ id: string }>(sql`
    update monitors set last_checked_at = now()
    where id in (
      select id from monitors
      where paused = false
        and (last_checked_at is null
             or last_checked_at <= now() - make_interval(secs => greatest(interval_seconds - 30, 30)))
      order by last_checked_at asc nulls first
      limit ${limit}
      for update skip locked
    )
    returning id
  `);
  const ids = result.rows.map((row) => row.id);
  if (ids.length === 0) return [];
  return db.query.monitors.findMany({ where: (m, { inArray }) => inArray(m.id, ids) });
}

async function handleIncident(monitor: Monitor, result: CheckResult, workspaceName: string, webhookUrl: string | null, slug: string) {
  const dashboardBase = appUrl();
  const dashboardUrl = dashboardBase ? `${dashboardBase}/app/${slug}/monitors/${monitor.id}` : undefined;

  if (result.status === "down") {
    // The partial unique index makes this a no-op if an incident is already open.
    const opened = await db
      .insert(schema.incidents)
      .values({ monitorId: monitor.id, workspaceId: monitor.workspaceId, cause: result.error ?? "Unknown failure" })
      .onConflictDoNothing()
      .returning({ id: schema.incidents.id });
    if (opened.length > 0 && webhookUrl) {
      await sendWebhook(webhookUrl, {
        kind: "opened",
        workspaceName,
        monitorName: monitor.name,
        monitorUrl: monitor.url,
        cause: result.error ?? undefined,
        dashboardUrl,
      });
    }
    return;
  }

  const resolved = await db
    .update(schema.incidents)
    .set({ resolvedAt: new Date() })
    .where(and(eq(schema.incidents.monitorId, monitor.id), isNull(schema.incidents.resolvedAt)))
    .returning({ startedAt: schema.incidents.startedAt });
  if (resolved.length > 0 && webhookUrl) {
    await sendWebhook(webhookUrl, {
      kind: "resolved",
      workspaceName,
      monitorName: monitor.name,
      monitorUrl: monitor.url,
      durationMs: Date.now() - resolved[0].startedAt.getTime(),
      dashboardUrl,
    });
  }
}

/** Runs one monitor end to end and persists everything. */
export async function runMonitor(monitor: Monitor): Promise<CheckResult> {
  const result = await runHttpCheckWithRetry({
    url: monitor.url,
    method: monitor.method,
    expectedStatus: monitor.expectedStatus,
    keyword: monitor.keyword,
    timeoutMs: monitor.timeoutMs,
    degradedThresholdMs: monitor.degradedThresholdMs,
  });

  const now = new Date();
  const sslDue = !monitor.sslCheckedAt || now.getTime() - monitor.sslCheckedAt.getTime() > SSL_RECHECK_MS;
  const sslExpiresAt = sslDue ? await getCertificateExpiry(monitor.url) : monitor.sslExpiresAt;

  await db.insert(schema.checks).values({
    monitorId: monitor.id,
    checkedAt: now,
    status: result.status,
    statusCode: result.statusCode,
    latencyMs: result.latencyMs,
    error: result.error,
  });

  await db
    .update(schema.monitors)
    .set({
      status: result.status,
      lastCheckedAt: now,
      lastLatencyMs: result.latencyMs,
      ...(sslDue ? { sslExpiresAt, sslCheckedAt: now } : {}),
    })
    .where(eq(schema.monitors.id, monitor.id));

  const workspace = await db.query.workspaces.findFirst({ where: eq(schema.workspaces.id, monitor.workspaceId) });
  if (workspace) {
    await handleIncident(monitor, result, workspace.name, workspace.webhookUrl, workspace.slug);
  }

  return result;
}

async function pruneOldChecks() {
  await db.delete(schema.checks).where(lt(schema.checks.checkedAt, sql`now() - make_interval(days => ${RETENTION_DAYS})`));
}

export type RunSummary = { checked: number; up: number; degraded: number; down: number; durationMs: number };

/** Entry point for the scheduler. Keeps claiming batches until nothing is due or the time budget runs out. */
export async function runDueMonitors(timeBudgetMs = 45_000): Promise<RunSummary> {
  const started = Date.now();
  const summary: RunSummary = { checked: 0, up: 0, degraded: 0, down: 0, durationMs: 0 };

  while (Date.now() - started < timeBudgetMs) {
    const batch = await claimDueMonitors(BATCH_CONCURRENCY);
    if (batch.length === 0) break;
    const results = await Promise.allSettled(batch.map((monitor) => runMonitor(monitor)));
    for (const outcome of results) {
      if (outcome.status === "fulfilled") {
        summary.checked += 1;
        summary[outcome.value.status] += 1;
      } else {
        console.error("[sitewatch] monitor run failed", outcome.reason);
      }
    }
  }

  await pruneOldChecks();
  summary.durationMs = Date.now() - started;
  return summary;
}
