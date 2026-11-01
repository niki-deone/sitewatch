// tests/url-guard.test.ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { assertPublicUrl, BlockedTargetError, isPrivateAddress } from "@/lib/monitoring/url-guard";

describe("isPrivateAddress", () => {
  it.each([
    ["127.0.0.1", true],
    ["10.1.2.3", true],
    ["172.16.0.5", true],
    ["172.31.255.255", true],
    ["192.168.1.1", true],
    ["169.254.169.254", true],
    ["100.64.0.1", true],
    ["0.0.0.0", true],
    ["::1", true],
    ["fd00::1", true],
    ["fe80::1", true],
    ["::ffff:127.0.0.1", true],
    ["8.8.8.8", false],
    ["172.32.0.1", false],
    ["1.1.1.1", false],
    ["2606:4700:4700::1111", false],
  ])("%s -> %s", (ip, expected) => {
    expect(isPrivateAddress(ip)).toBe(expected);
  });
});

describe("assertPublicUrl", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("rejects non-http schemes", async () => {
    await expect(assertPublicUrl("file:///etc/passwd")).rejects.toBeInstanceOf(BlockedTargetError);
    await expect(assertPublicUrl("ftp://example.com")).rejects.toBeInstanceOf(BlockedTargetError);
  });

  it("rejects loopback, metadata and localhost targets", async () => {
    await expect(assertPublicUrl("http://127.0.0.1:3000")).rejects.toThrow(/private/);
    await expect(assertPublicUrl("http://169.254.169.254/latest/meta-data")).rejects.toThrow(/private/);
    await expect(assertPublicUrl("http://localhost:5432")).rejects.toThrow(/Private/);
    await expect(assertPublicUrl("http://[::1]/")).rejects.toThrow(/private/);
  });

  it("rejects embedded credentials", async () => {
    await expect(assertPublicUrl("https://user:pass@example.com")).rejects.toThrow(/credentials/);
  });

  it("accepts a public IP literal", async () => {
    const url = await assertPublicUrl("https://1.1.1.1/");
    expect(url.hostname).toBe("1.1.1.1");
  });

  it("allows private targets only with the dev override", async () => {
    vi.stubEnv("ALLOW_PRIVATE_TARGETS", "1");
    vi.stubEnv("NODE_ENV", "test");
    await expect(assertPublicUrl("http://127.0.0.1:1")).resolves.toBeInstanceOf(URL);
    vi.stubEnv("NODE_ENV", "production");
    await expect(assertPublicUrl("http://127.0.0.1:1")).rejects.toThrow(/private/);
  });
});
