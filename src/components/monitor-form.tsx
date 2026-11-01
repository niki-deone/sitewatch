// src/components/monitor-form.tsx
"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { ChevronDown, Loader2 } from "lucide-react";
import type { FormState } from "@/lib/validation";
import { INTERVAL_OPTIONS, TIMEOUT_OPTIONS } from "@/lib/validation";
import { formatInterval } from "@/lib/format";
import { Button, buttonClass, Card, Checkbox, Field, Input, Select } from "@/components/ui";

type Defaults = {
  name: string;
  url: string;
  method: "GET" | "HEAD";
  expectedStatus: number | null;
  keyword: string | null;
  intervalSeconds: number;
  timeoutMs: number;
  degradedThresholdMs: number;
  showOnStatusPage: boolean;
};

export const emptyMonitor: Defaults = {
  name: "",
  url: "",
  method: "GET",
  expectedStatus: null,
  keyword: null,
  intervalSeconds: 300,
  timeoutMs: 10000,
  degradedThresholdMs: 2000,
  showOnStatusPage: true,
};

export function MonitorForm({
  action,
  defaults,
  submitLabel,
  cancelHref,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  defaults: Defaults;
  submitLabel: string;
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [advanced, setAdvanced] = useState(Boolean(defaults.keyword || defaults.expectedStatus || defaults.method === "HEAD"));
  const errors = state.fieldErrors ?? {};
  // After a failed submit, show what the user typed; otherwise the saved defaults.
  const v = state.values;
  const val = (key: keyof Defaults) => (v ? (v[key] ?? "") : String(defaults[key] ?? ""));

  return (
    <form action={formAction} className="grid gap-5" noValidate>
      {state.error ? (
        <div role="alert" className="rounded-[var(--radius-ctl)] border border-down/40 bg-down-soft px-4 py-3 text-[13.5px] text-down">
          {state.error}
        </div>
      ) : null}

      <Card className="grid gap-5 p-5 sm:p-6">
        <div className="grid gap-5 sm:grid-cols-[1fr_1.4fr]">
          <Field label="Name" htmlFor="name" error={errors.name} hint="Shown on the dashboard and status page.">
            <Input id="name" name="name" defaultValue={val("name")} placeholder="Marketing site" autoComplete="off" aria-invalid={Boolean(errors.name)} required maxLength={60} />
          </Field>
          <Field label="URL" htmlFor="url" error={errors.url} hint="Public http or https address. https:// is added if you skip it.">
            <Input id="url" name="url" type="url" inputMode="url" defaultValue={val("url")} placeholder="https://example.com/health" className="font-mono text-[13px]" aria-invalid={Boolean(errors.url)} required />
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Check interval" htmlFor="intervalSeconds" error={errors.intervalSeconds}>
            <Select id="intervalSeconds" name="intervalSeconds" defaultValue={val("intervalSeconds")}>
              {INTERVAL_OPTIONS.map((seconds) => (
                <option key={seconds} value={seconds}>
                  {formatInterval(seconds).replace("every", "Every")}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Timeout" htmlFor="timeoutMs" error={errors.timeoutMs}>
            <Select id="timeoutMs" name="timeoutMs" defaultValue={val("timeoutMs")}>
              {TIMEOUT_OPTIONS.map((ms) => (
                <option key={ms} value={ms}>
                  {ms / 1000} seconds
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Slow above (ms)" htmlFor="degradedThresholdMs" error={errors.degradedThresholdMs} hint="Slower answers count as degraded.">
            <Input id="degradedThresholdMs" name="degradedThresholdMs" type="number" min={200} max={30000} step={100} defaultValue={val("degradedThresholdMs")} className="font-mono" />
          </Field>
        </div>

        <div className="border-t border-line pt-4">
          <button
            type="button"
            onClick={() => setAdvanced((value) => !value)}
            aria-expanded={advanced}
            className="flex items-center gap-1.5 rounded text-[13px] font-medium text-ink-2 hover:text-ink"
          >
            <ChevronDown className={`size-4 transition-transform ${advanced ? "rotate-180" : ""}`} aria-hidden />
            Assertions
          </button>

          <div className={advanced ? "mt-4 grid gap-5 sm:grid-cols-3" : "hidden"}>
            <Field label="Method" htmlFor="method">
              <Select id="method" name="method" defaultValue={val("method")}>
                <option value="GET">GET</option>
                <option value="HEAD">HEAD (no body)</option>
              </Select>
            </Field>
            <Field label="Expected status" htmlFor="expectedStatus" error={errors.expectedStatus} hint="Empty means any 2xx or 3xx.">
              <Input id="expectedStatus" name="expectedStatus" type="number" min={100} max={599} defaultValue={val("expectedStatus")} placeholder="200" className="font-mono" />
            </Field>
            <Field label="Must contain" htmlFor="keyword" error={errors.keyword} hint="Text that has to appear in the response (GET only).">
              <Input id="keyword" name="keyword" defaultValue={val("keyword")} placeholder="Welcome" maxLength={200} />
            </Field>
          </div>
        </div>

        <Checkbox
          name="showOnStatusPage"
          defaultChecked={v ? v.showOnStatusPage === "on" : defaults.showOnStatusPage}
          label="Show on the public status page"
          description="Visitors see the name and uptime only, never the URL or settings."
        />
      </Card>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Link href={cancelHref} className={buttonClass("ghost")}>
          Cancel
        </Link>
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          {pending ? "Checking URL…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
