// src/db/index.ts
import "server-only";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

declare global {
  var __sitewatchPool: Pool | undefined;
}

function createPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.");
  }
  return new Pool({
    connectionString,
    // Serverless functions run many short-lived instances; keep each pool small.
    max: 5,
    idleTimeoutMillis: 10_000,
  });
}

// Reuse one pool across hot reloads in development.
const pool = globalThis.__sitewatchPool ?? createPool();
if (process.env.NODE_ENV !== "production") globalThis.__sitewatchPool = pool;

export const db = drizzle(pool, { schema });
export { schema };
