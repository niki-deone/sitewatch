// src/app/api/cron/check/route.ts
import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { runDueMonitors } from "@/lib/monitoring/runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(header);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

/**
 * Called every few minutes by GitHub Actions (and once a day by Vercel Cron as a safety net).
 * Both send `Authorization: Bearer <CRON_SECRET>`.
 */
export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const summary = await runDueMonitors();
  return NextResponse.json({ ok: true, ...summary });
}

export const POST = GET;
