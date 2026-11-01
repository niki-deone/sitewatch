// src/lib/validation.ts
import { z } from "zod";

export const INTERVAL_OPTIONS = [300, 600, 900, 1800, 3600] as const;
export const TIMEOUT_OPTIONS = [5000, 10000, 15000, 30000] as const;
export const MAX_MONITORS_PER_WORKSPACE = 25;

const optionalString = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value === "" ? null : value));

export const monitorInput = z.object({
  name: z.string().trim().min(1, "Give the monitor a name").max(60, "Keep it under 60 characters"),
  url: z
    .string()
    .trim()
    .min(1, "Enter a URL")
    .max(2048)
    .transform((value) => (/^https?:\/\//i.test(value) ? value : `https://${value}`))
    .refine((value) => {
      try {
        const parsed = new URL(value);
        return (parsed.protocol === "http:" || parsed.protocol === "https:") && parsed.hostname.includes(".");
      } catch {
        return false;
      }
    }, "Enter a valid http(s) URL, for example https://example.com"),
  method: z.enum(["GET", "HEAD"]),
  expectedStatus: z
    .string()
    .trim()
    .transform((value) => (value === "" ? null : Number(value)))
    .refine((value) => value === null || (Number.isInteger(value) && value >= 100 && value <= 599), "Status must be between 100 and 599"),
  keyword: optionalString(200),
  intervalSeconds: z.coerce.number().refine((value) => (INTERVAL_OPTIONS as readonly number[]).includes(value), "Pick an interval"),
  timeoutMs: z.coerce.number().refine((value) => (TIMEOUT_OPTIONS as readonly number[]).includes(value), "Pick a timeout"),
  degradedThresholdMs: z.coerce.number().int().min(200, "At least 200 ms").max(30000, "At most 30 s"),
  showOnStatusPage: z.boolean(),
});

export type MonitorInput = z.infer<typeof monitorInput>;

export function readMonitorForm(formData: FormData) {
  return monitorInput.safeParse({
    name: formData.get("name") ?? "",
    url: formData.get("url") ?? "",
    method: formData.get("method") ?? "GET",
    expectedStatus: formData.get("expectedStatus") ?? "",
    keyword: formData.get("keyword") ?? "",
    intervalSeconds: formData.get("intervalSeconds") ?? 300,
    timeoutMs: formData.get("timeoutMs") ?? 10000,
    degradedThresholdMs: formData.get("degradedThresholdMs") ?? 2000,
    showOnStatusPage: formData.get("showOnStatusPage") === "on",
  });
}

export const workspaceSettingsInput = z.object({
  name: z.string().trim().min(2, "At least 2 characters").max(50),
  statusPagePublic: z.boolean(),
  statusPageTitle: optionalString(80),
  webhookUrl: optionalString(500).refine(
    (value) => value === null || /^https:\/\/(hooks\.slack\.com|discord\.com|discordapp\.com|[a-z0-9.-]+)\//i.test(value),
    "Use an https webhook URL from Slack or Discord",
  ),
});

export const workspaceNameInput = z.string().trim().min(2, "At least 2 characters").max(50, "At most 50 characters");

export type FormState = {
  ok?: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
  // React 19 resets uncontrolled forms after an action. Echoing the submitted
  // values back lets the form re-render with what the user typed instead of losing it.
  values?: Record<string, string>;
};

export function formValues(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string" && !key.startsWith("$")) values[key] = value;
  }
  return values;
}

export function fieldErrorsFrom(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!result[key]) result[key] = issue.message;
  }
  return result;
}
