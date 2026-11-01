// scripts/seed-demo.ts
// Recreates the read-only demo workspace from scratch.
// Not required in production: the demo login creates the workspace on first use.
// Usage: npm run db:seed
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../src/db/schema";
import { DEMO_SLUG, resetDemo } from "../src/lib/demo-seed";

try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local: rely on real environment variables.
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  const pool = new Pool({ connectionString });
  const db = drizzle(pool, { schema });

  console.log("Recreating the demo workspace…");
  await resetDemo(db);
  console.log(`Demo workspace ready at /app/${DEMO_SLUG} and /status/${DEMO_SLUG}`);
  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
