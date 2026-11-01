// tests/permissions.test.ts
import { describe, expect, it } from "vitest";
import { can } from "@/lib/permissions";
import { buildMessage, formatDuration } from "@/lib/monitoring/notify";
import { slugify } from "@/lib/slug";

describe("role permissions", () => {
  it("viewers can't change anything", () => {
    expect(can("viewer", "monitor:write")).toBe(false);
    expect(can("viewer", "monitor:run")).toBe(false);
    expect(can("viewer", "workspace:settings")).toBe(false);
  });

  it("members manage monitors but not the workspace", () => {
    expect(can("member", "monitor:write")).toBe(true);
    expect(can("member", "workspace:settings")).toBe(false);
    expect(can("member", "workspace:members")).toBe(false);
  });

  it("only owners delete the workspace", () => {
    expect(can("admin", "workspace:delete")).toBe(false);
    expect(can("owner", "workspace:delete")).toBe(true);
  });
});

describe("helpers", () => {
  it("slugifies names", () => {
    expect(slugify("Nikita's Workspace!")).toBe("nikita-s-workspace");
    expect(slugify("Café Ünïcode")).toBe("cafe-unicode");
    expect(slugify("***")).toBe("workspace");
  });

  it("formats durations", () => {
    expect(formatDuration(20_000)).toBe("less than a minute");
    expect(formatDuration(5 * 60_000)).toBe("5 min");
    expect(formatDuration(125 * 60_000)).toBe("2 h 5 min");
    expect(formatDuration(26 * 3600_000)).toBe("1 d 2 h");
  });

  it("builds incident messages", () => {
    const opened = buildMessage({ kind: "opened", workspaceName: "Acme", monitorName: "API", monitorUrl: "https://api.acme.dev", cause: "Timed out" });
    expect(opened).toContain("API is DOWN");
    expect(opened).toContain("Timed out");
  });
});
