// scripts/run-checks.ts
// Calls the cron endpoint the same way the scheduler does. Handy for local testing.
// Usage: npm run checks  (needs APP_URL and CRON_SECRET in .env.local, defaults to http://localhost:3000)
try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local: rely on real environment variables.
}

const base = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
const secret = process.env.CRON_SECRET;

async function main() {
  if (!secret) throw new Error("CRON_SECRET is not set");
  const response = await fetch(`${base}/api/cron/check`, { headers: { authorization: `Bearer ${secret}` } });
  const body = await response.text();
  console.log(response.status, body);
  if (!response.ok) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

export {};
