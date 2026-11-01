// src/lib/monitoring/checker.ts
// Performs one HTTP check. Pure with respect to the database, which keeps it easy to test.
import { assertPublicUrl, BlockedTargetError } from "./url-guard";

export type CheckTarget = {
  url: string;
  method: "GET" | "HEAD";
  expectedStatus: number | null;
  keyword: string | null;
  timeoutMs: number;
  degradedThresholdMs: number;
};

export type CheckResult = {
  status: "up" | "degraded" | "down";
  statusCode: number | null;
  latencyMs: number | null;
  error: string | null;
};

const MAX_REDIRECTS = 5;
const MAX_BODY_BYTES = 1_000_000;
const USER_AGENT = "SiteWatchBot/1.0 (+https://github.com/niki-deone/sitewatch)";

async function readBodyText(response: Response): Promise<string> {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let received = 0;
  let text = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    text += decoder.decode(value, { stream: true });
    if (received >= MAX_BODY_BYTES) {
      await reader.cancel();
      break;
    }
  }
  return text + decoder.decode();
}

function describeError(error: unknown, timeoutMs: number): string {
  if (error instanceof BlockedTargetError) return error.message;
  if (error instanceof Error) {
    if (error.name === "AbortError" || error.name === "TimeoutError") return `Timed out after ${timeoutMs} ms`;
    if (error.message === "bad port") return "This port is blocked for security reasons";
    const cause = (error as Error & { cause?: { code?: string; message?: string } }).cause;
    if (cause?.code === "ENOTFOUND") return "DNS lookup failed";
    if (cause?.code === "ECONNREFUSED") return "Connection refused";
    if (cause?.code === "ECONNRESET") return "Connection reset";
    if (cause?.code?.startsWith("ERR_TLS") || cause?.code?.includes("CERT")) return `TLS error: ${cause.code}`;
    return cause?.message ?? error.message;
  }
  return "Unknown error";
}

function statusMatches(expected: number | null, actual: number): boolean {
  if (expected !== null) return actual === expected;
  return actual >= 200 && actual < 400;
}

/** Runs a single check: follows redirects manually so every hop passes the SSRF guard. */
export async function runHttpCheck(target: CheckTarget): Promise<CheckResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), target.timeoutMs);
  const started = performance.now();

  try {
    let currentUrl = target.url;
    let response: Response | null = null;

    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const url = await assertPublicUrl(currentUrl);
      response = await fetch(url, {
        method: target.method,
        redirect: "manual",
        signal: controller.signal,
        headers: { "user-agent": USER_AGENT, accept: "text/html,application/json;q=0.9,*/*;q=0.8" },
        cache: "no-store",
      });

      const location = response.headers.get("location");
      if (response.status >= 300 && response.status < 400 && location) {
        if (hop === MAX_REDIRECTS) {
          await response.body?.cancel();
          throw new Error(`Too many redirects (more than ${MAX_REDIRECTS})`);
        }
        currentUrl = new URL(location, url).toString();
        await response.body?.cancel();
        continue;
      }
      break;
    }

    if (!response) throw new Error("No response");

    let body = "";
    if (target.keyword && target.method === "GET") {
      body = await readBodyText(response);
    } else {
      await response.body?.cancel();
    }
    const latencyMs = Math.round(performance.now() - started);

    if (!statusMatches(target.expectedStatus, response.status)) {
      const expected = target.expectedStatus ?? "2xx or 3xx";
      return { status: "down", statusCode: response.status, latencyMs, error: `Expected ${expected}, got ${response.status}` };
    }

    if (target.keyword && target.method === "GET" && !body.includes(target.keyword)) {
      return { status: "down", statusCode: response.status, latencyMs, error: `Keyword "${target.keyword}" not found` };
    }

    const status = latencyMs > target.degradedThresholdMs ? "degraded" : "up";
    return {
      status,
      statusCode: response.status,
      latencyMs,
      error: status === "degraded" ? `Slow response: ${latencyMs} ms (threshold ${target.degradedThresholdMs} ms)` : null,
    };
  } catch (error) {
    return { status: "down", statusCode: null, latencyMs: null, error: describeError(error, target.timeoutMs) };
  } finally {
    clearTimeout(timer);
  }
}

/** One failed check can be a network blip. Retry once before reporting the site as down. */
export async function runHttpCheckWithRetry(target: CheckTarget, retryDelayMs = 1500): Promise<CheckResult> {
  const first = await runHttpCheck(target);
  if (first.status !== "down") return first;
  await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
  return runHttpCheck(target);
}
