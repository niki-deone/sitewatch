// src/lib/demo-seed.ts
// Builds the read-only demo workspace with real public monitors.
// The history is generated so the charts aren't empty on day one; from then on the scheduler adds real checks on top.
// Used by the demo login (created on first use) and by `npm run db:seed` (recreated from scratch).
// No "server-only" import here: the seed script runs this file directly with tsx.
import { eq, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "../db/schema";

type Db = NodePgDatabase<typeof schema>;

export const DEMO_SLUG = "demo";
const DAYS = 90;
const STEP_MINUTES = 30;
// Arbitrary constant key for pg_advisory_xact_lock, so two first-time demo logins never seed twice.
const DEMO_LOCK_KEY = 4_270_011;

type DemoMonitor = {
  name: string;
  url: string;
  keyword?: string;
  expectedStatus?: number;
  baseLatency: number;
  jitter: number;
  // Outages as [daysAgo, durationMinutes]; 9999 minutes starting today means "still down".
  outages: Array<[number, number]>;
  slowDays?: number[];
};

const demoMonitors: DemoMonitor[] = [
  { name: "Marketing site", url: "https://example.com", keyword: "Example Domain", baseLatency: 120, jitter: 60, outages: [[18, 35]] },
  { name: "Public API", url: "https://api.github.com", expectedStatus: 200, baseLatency: 180, jitter: 90, outages: [[6, 20]], slowDays: [12, 13] },
  { name: "Help center", url: "https://www.wikipedia.org", keyword: "Wikipedia", baseLatency: 240, jitter: 120, outages: [] },
  { name: "DNS resolver", url: "https://1.1.1.1", baseLatency: 60, jitter: 25, outages: [] },
  { name: "Docs", url: "https://nextjs.org/docs", keyword: "Next.js", baseLatency: 210, jitter: 110, outages: [[24, 50]], slowDays: [2] },
  { name: "Legacy billing API", url: "https://httpbin.org/status/503", baseLatency: 420, jitter: 160, outages: [[0, 9999]] },
];

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

async function createDemo(tx: Db) {
  const [user] = await tx
    .insert(schema.users)
    .values({ name: "Demo visitor", email: "demo@sitewatch.dev", isDemo: true })
    .returning();

  const [workspace] = await tx
    .insert(schema.workspaces)
    .values({ name: "Acme Inc", slug: DEMO_SLUG, statusPagePublic: true, statusPageTitle: "Acme status" })
    .returning();

  await tx.insert(schema.memberships).values({ workspaceId: workspace.id, userId: user.id, role: "viewer" });

  const now = Date.now();
  const totalSteps = (DAYS * 24 * 60) / STEP_MINUTES;

  for (const [index, demo] of demoMonitors.entries()) {
    const random = rng(index * 97 + 13);
    const alwaysDown = demo.outages.some(([daysAgo, duration]) => daysAgo === 0 && duration >= 9999);

    const [monitor] = await tx
      .insert(schema.monitors)
      .values({
        workspaceId: workspace.id,
        name: demo.name,
        url: demo.url,
        keyword: demo.keyword ?? null,
        expectedStatus: demo.expectedStatus ?? null,
        intervalSeconds: 300,
        status: alwaysDown ? "down" : "up",
        lastCheckedAt: new Date(now - 60_000),
        lastLatencyMs: Math.round(demo.baseLatency),
      })
      .returning();

    const outageWindows = demo.outages.map(([daysAgo, duration]) => {
      const start = alwaysDown && duration >= 9999 ? now - 3 * 3600_000 : now - daysAgo * 86_400_000 - Math.floor(random() * 10) * 3600_000;
      const end = duration >= 9999 ? Number.POSITIVE_INFINITY : start + duration * 60_000;
      return { start, end };
    });

    const incidentRows: Array<typeof schema.incidents.$inferInsert> = outageWindows.map((window) => ({
      monitorId: monitor.id,
      workspaceId: workspace.id,
      cause: demo.expectedStatus ? `Expected ${demo.expectedStatus}, got 502` : alwaysDown ? "Expected 2xx or 3xx, got 503" : "Timed out after 10000 ms",
      startedAt: new Date(window.start),
      resolvedAt: Number.isFinite(window.end) ? new Date(window.end) : null,
    }));

    const rows: Array<typeof schema.checks.$inferInsert> = [];
    for (let step = totalSteps; step >= 1; step--) {
      const checkedAt = now - step * STEP_MINUTES * 60_000;
      const daysAgo = Math.floor((now - checkedAt) / 86_400_000);
      const inOutage = outageWindows.some((window) => checkedAt >= window.start && checkedAt < window.end);
      const slow = demo.slowDays?.includes(daysAgo) && random() > 0.5;
      const latency = Math.max(20, Math.round(demo.baseLatency + (random() - 0.5) * demo.jitter * 2 + (slow ? 2200 : 0) + (random() > 0.985 ? 900 : 0)));

      if (inOutage) {
        rows.push({
          monitorId: monitor.id,
          checkedAt: new Date(checkedAt),
          status: "down",
          statusCode: alwaysDown ? 503 : demo.expectedStatus ? 502 : null,
          latencyMs: alwaysDown ? latency : null,
          error: alwaysDown ? "Expected 2xx or 3xx, got 503" : demo.expectedStatus ? `Expected ${demo.expectedStatus}, got 502` : "Timed out after 10000 ms",
        });
      } else {
        const degraded = latency > 2000;
        rows.push({
          monitorId: monitor.id,
          checkedAt: new Date(checkedAt),
          status: degraded ? "degraded" : "up",
          statusCode: demo.expectedStatus ?? 200,
          latencyMs: latency,
          error: degraded ? `Slow response: ${latency} ms (threshold 2000 ms)` : null,
        });
      }
    }

    for (let i = 0; i < rows.length; i += 1000) {
      await tx.insert(schema.checks).values(rows.slice(i, i + 1000));
    }
    if (incidentRows.length) await tx.insert(schema.incidents).values(incidentRows);
  }

  return user;
}

/** Returns the demo user, creating the whole demo workspace first if it doesn't exist yet. Safe under concurrent calls. */
export async function ensureDemoUser(db: Db) {
  const existing = await db.query.users.findFirst({ where: eq(schema.users.isDemo, true) });
  if (existing) return existing;

  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(${DEMO_LOCK_KEY})`);
    // Another request may have finished seeding while we waited for the lock.
    const again = await tx.query.users.findFirst({ where: eq(schema.users.isDemo, true) });
    if (again) return again;
    // A leftover demo workspace without its user (e.g. deleted by hand) would block the unique slug.
    await tx.delete(schema.workspaces).where(eq(schema.workspaces.slug, DEMO_SLUG));
    return createDemo(tx as unknown as Db);
  });
}

/** Deletes and recreates the demo workspace. Used by the seed script. */
export async function resetDemo(db: Db) {
  await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(${DEMO_LOCK_KEY})`);
    await tx.delete(schema.workspaces).where(eq(schema.workspaces.slug, DEMO_SLUG));
    await tx.delete(schema.users).where(eq(schema.users.isDemo, true));
    await createDemo(tx as unknown as Db);
  });
}
