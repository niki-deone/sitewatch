// tests/checker.test.ts
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { runHttpCheck, runHttpCheckWithRetry, type CheckTarget } from "@/lib/monitoring/checker";

let server: Server;
let base = "";
let flakyHits = 0;

beforeAll(async () => {
  vi.stubEnv("ALLOW_PRIVATE_TARGETS", "1");
  vi.stubEnv("NODE_ENV", "test");
  server = createServer((req, res) => {
    switch (req.url) {
      case "/ok":
        res.writeHead(200, { "content-type": "text/html" }).end("<h1>Welcome to Acme</h1>");
        break;
      case "/slow":
        setTimeout(() => res.writeHead(200).end("slow"), 300);
        break;
      case "/hang":
        // Never answers, to trigger the timeout.
        break;
      case "/error":
        res.writeHead(503).end("maintenance");
        break;
      case "/redirect":
        res.writeHead(302, { location: "/ok" }).end();
        break;
      case "/loop":
        res.writeHead(302, { location: "/loop" }).end();
        break;
      case "/flaky":
        flakyHits += 1;
        res.writeHead(flakyHits === 1 ? 500 : 200).end("flaky");
        break;
      default:
        res.writeHead(404).end("not found");
    }
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  vi.unstubAllEnvs();
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
});

const target = (path: string, overrides: Partial<CheckTarget> = {}): CheckTarget => ({
  url: `${base}${path}`,
  method: "GET",
  expectedStatus: null,
  keyword: null,
  timeoutMs: 2000,
  degradedThresholdMs: 2000,
  ...overrides,
});

describe("runHttpCheck", () => {
  it("reports up with status code and latency", async () => {
    const result = await runHttpCheck(target("/ok"));
    expect(result.status).toBe("up");
    expect(result.statusCode).toBe(200);
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    expect(result.error).toBeNull();
  });

  it("finds a keyword in the body", async () => {
    expect((await runHttpCheck(target("/ok", { keyword: "Acme" }))).status).toBe("up");
    const missing = await runHttpCheck(target("/ok", { keyword: "Globex" }));
    expect(missing.status).toBe("down");
    expect(missing.error).toMatch(/Keyword "Globex" not found/);
  });

  it("marks 5xx as down", async () => {
    const result = await runHttpCheck(target("/error"));
    expect(result).toMatchObject({ status: "down", statusCode: 503 });
  });

  it("respects an explicit expected status", async () => {
    expect((await runHttpCheck(target("/error", { expectedStatus: 503 }))).status).toBe("up");
    expect((await runHttpCheck(target("/ok", { expectedStatus: 201 }))).error).toMatch(/Expected 201, got 200/);
  });

  it("marks slow responses as degraded", async () => {
    const result = await runHttpCheck(target("/slow", { degradedThresholdMs: 100 }));
    expect(result.status).toBe("degraded");
    expect(result.error).toMatch(/Slow response/);
  });

  it("times out", async () => {
    const result = await runHttpCheck(target("/hang", { timeoutMs: 300 }));
    expect(result.status).toBe("down");
    expect(result.error).toMatch(/Timed out after 300 ms/);
  });

  it("follows redirects and stops redirect loops", async () => {
    expect((await runHttpCheck(target("/redirect", { keyword: "Acme" }))).status).toBe("up");
    expect((await runHttpCheck(target("/loop"))).error).toMatch(/Too many redirects/);
  });

  it("reports connection refused", async () => {
    // Grab a free port, then close it so nothing listens there.
    const probe = createServer();
    await new Promise<void>((resolve) => probe.listen(0, "127.0.0.1", resolve));
    const closedPort = (probe.address() as AddressInfo).port;
    await new Promise((resolve) => probe.close(resolve));
    const result = await runHttpCheck({ ...target("/"), url: `http://127.0.0.1:${closedPort}/` });
    expect(result.status).toBe("down");
    expect(result.error).toMatch(/refused/i);
  });

  it("blocks private targets when the override is off", async () => {
    vi.stubEnv("ALLOW_PRIVATE_TARGETS", "0");
    const result = await runHttpCheck(target("/ok"));
    vi.stubEnv("ALLOW_PRIVATE_TARGETS", "1");
    expect(result.status).toBe("down");
    expect(result.error).toMatch(/private/);
  });

  it("retries once before reporting down", async () => {
    flakyHits = 0;
    const result = await runHttpCheckWithRetry(target("/flaky"), 10);
    expect(result.status).toBe("up");
    expect(flakyHits).toBe(2);
  });
});
