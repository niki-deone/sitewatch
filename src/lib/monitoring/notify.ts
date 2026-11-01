// src/lib/monitoring/notify.ts
import { assertPublicUrl } from "./url-guard";

export type IncidentEvent = {
  kind: "opened" | "resolved" | "test";
  workspaceName: string;
  monitorName: string;
  monitorUrl: string;
  cause?: string;
  durationMs?: number;
  dashboardUrl?: string;
};

export function formatDuration(ms: number): string {
  const minutes = Math.round(ms / 60000);
  if (minutes < 1) return "less than a minute";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours < 24) return rest ? `${hours} h ${rest} min` : `${hours} h`;
  const days = Math.floor(hours / 24);
  return `${days} d ${hours % 24} h`;
}

export function buildMessage(event: IncidentEvent): string {
  const link = event.dashboardUrl ? `\n${event.dashboardUrl}` : "";
  switch (event.kind) {
    case "opened":
      return `🔴 ${event.monitorName} is DOWN (${event.workspaceName})\n${event.monitorUrl}\nCause: ${event.cause ?? "unknown"}${link}`;
    case "resolved":
      return `🟢 ${event.monitorName} is back UP after ${formatDuration(event.durationMs ?? 0)} (${event.workspaceName})\n${event.monitorUrl}${link}`;
    case "test":
      return `✅ SiteWatch test notification for ${event.workspaceName}. Your webhook works.`;
  }
}

/**
 * Sends a message to a Slack or Discord incoming webhook.
 * Slack reads `text`, Discord reads `content`, so we send both.
 */
export async function sendWebhook(webhookUrl: string, event: IncidentEvent): Promise<{ ok: boolean; error?: string }> {
  try {
    await assertPublicUrl(webhookUrl);
    const message = buildMessage(event);
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: message, content: message }),
      signal: AbortSignal.timeout(8000),
      redirect: "error",
    });
    if (!response.ok) return { ok: false, error: `Webhook answered ${response.status}` };
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Webhook failed" };
  }
}
