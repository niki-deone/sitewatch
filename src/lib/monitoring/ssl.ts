// src/lib/monitoring/ssl.ts
import { connect } from "node:tls";

/** Opens a TLS connection and reads the certificate expiry date. Returns null for http URLs or on failure. */
export function getCertificateExpiry(rawUrl: string, timeoutMs = 8000): Promise<Date | null> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return Promise.resolve(null);
  }
  if (url.protocol !== "https:") return Promise.resolve(null);

  return new Promise((resolve) => {
    const socket = connect({
      host: url.hostname,
      port: url.port ? Number(url.port) : 443,
      servername: url.hostname,
      rejectUnauthorized: false,
      timeout: timeoutMs,
    });

    const finish = (value: Date | null) => {
      socket.destroy();
      resolve(value);
    };

    socket.once("secureConnect", () => {
      const cert = socket.getPeerCertificate();
      if (!cert || !cert.valid_to) return finish(null);
      const expires = new Date(cert.valid_to);
      finish(Number.isNaN(expires.getTime()) ? null : expires);
    });
    socket.once("timeout", () => finish(null));
    socket.once("error", () => finish(null));
  });
}
