// scripts/seed-demo.ts
// Creates (or recreates) the read-only demo workspace with real public monitors.
// The 90 days of history are generated so charts aren't empty on day one;
// from then on, the scheduler adds real checks on top.
//
// Usage: npm run db:seed
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../src/db/schema";

try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local: rely on real environment variables.
}

const DEMO_SLUG = "demo";
const DAYS = 90;
const STEP_MINUTES = 20;

type DemoMonitor = {
  name: string;
  url: string;
  keyword?: string;
  expectedStatus?: number;
  baseLatency: number;
  jitter: number;
  // Outages as [daysAgo, durationMinutes]
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

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  const pool = new Pool({ connectionString });
  const db = drizzle(pool, { schema });

  console.log("Removing previous demo data…");
  await db.delete(schema.workspaces).where(eq(schema.workspaces.slug, DEMO_SLUG));
  await db.delete(schema.users).where(eq(schema.users.isDemo, true));

  const [user] = await db
    .insert(schema.users)
    .values({ name: "Demo visitor", email: "demo@sitewatch.dev", isDemo: true })
    .returning();

  const [workspace] = await db
    .insert(schema.workspaces)
    .values({ name: "Acme Inc", slug: DEMO_SLUG, statusPagePublic: true, statusPageTitle: "Acme status" })
    .returning();

  await db.insert(schema.memberships).values({ workspaceId: workspace.id, userId: user.id, role: "viewer" });

  const now = Date.now();
  const totalSteps = (DAYS * 24 * 60) / STEP_MINUTES;

  for (const [index, demo] of demoMonitors.entries()) {
    const random = rng(index * 97 + 13);
    const alwaysDown = demo.outages.some(([daysAgo, duration]) => daysAgo === 0 && duration >= 9999);

    const [monitor] = await db
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

    const rows: Array<typeof schema.checks.$inferInsert> = [];
    const incidentRows: Array<typeof schema.incidents.$inferInsert> = [];

    const outageWindows = demo.outages.map(([daysAgo, duration]) => {
      const start = alwaysDown && duration >= 9999 ? now - 3 * 3600_000 : now - daysAgo * 86_400_000 - Math.floor(random() * 10) * 3600_000;
      const end = duration >= 9999 ? Number.POSITIVE_INFINITY : start + duration * 60_000;
      return { start, end };
    });

    for (const window of outageWindows) {
      incidentRows.push({
        monitorId: monitor.id,
        workspaceId: workspace.id,
        cause: demo.expectedStatus ? `Expected ${demo.expectedStatus}, got 502` : alwaysDown ? "Expected 2xx or 3xx, got 503" : "Timed out after 10000 ms",
        startedAt: new Date(window.start),
        resolvedAt: Number.isFinite(window.end) ? new Date(window.end) : null,
      });
    }

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
      await db.insert(schema.checks).values(rows.slice(i, i + 1000));
    }
    if (incidentRows.length) await db.insert(schema.incidents).values(incidentRows);
    console.log(`  ${demo.name}: ${rows.length} checks, ${incidentRows.length} incidents`);
  }

  console.log(`Demo workspace ready at /app/${DEMO_SLUG} and /status/${DEMO_SLUG}`);
  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
