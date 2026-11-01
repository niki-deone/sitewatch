// src/components/settings-forms.tsx
"use client";

import { useActionState, useState, useTransition } from "react";
import { Check, Copy, Loader2, Send, Trash2, UserMinus } from "lucide-react";
import type { FormState } from "@/lib/validation";
import { Button, Card, CardHeader, Checkbox, Field, Input, Select } from "@/components/ui";

function Notice({ state }: { state: FormState }) {
  if (state.error) {
    return (
      <p role="alert" className="text-[13px] text-down">
        {state.error}
      </p>
    );
  }
  if (state.message) {
    return (
      <p role="status" className="text-[13px] text-up">
        {state.message}
      </p>
    );
  }
  return null;
}

export function GeneralSettingsForm({
  action,
  testAction,
  defaults,
  disabled,
  statusPageUrl,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  testAction: () => Promise<FormState>;
  defaults: { name: string; statusPagePublic: boolean; statusPageTitle: string | null; webhookUrl: string | null };
  disabled: boolean;
  statusPageUrl: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [testState, setTestState] = useState<FormState>({});
  const [testing, startTest] = useTransition();
  const errors = state.fieldErrors ?? {};
  const v = state.values;

  return (
    <Card>
      <CardHeader title="Workspace" description="Name, public status page and notifications." />
      <form action={formAction} className="grid gap-5 p-5 sm:p-6">
        <fieldset disabled={disabled} className="grid gap-5 disabled:opacity-70">
          <Field label="Workspace name" htmlFor="name" error={errors.name}>
            <Input id="name" name="name" defaultValue={v?.name ?? defaults.name} maxLength={50} aria-invalid={Boolean(errors.name)} />
          </Field>

          <Checkbox
            name="statusPagePublic"
            defaultChecked={v ? v.statusPagePublic === "on" : defaults.statusPagePublic}
            label="Publish a public status page"
            description={`Anyone with the link can see it: ${statusPageUrl}`}
          />

          <Field label="Status page title" htmlFor="statusPageTitle" error={errors.statusPageTitle} hint="Defaults to “<workspace> status”.">
            <Input id="statusPageTitle" name="statusPageTitle" defaultValue={v?.statusPageTitle ?? defaults.statusPageTitle ?? ""} maxLength={80} placeholder="Acme status" />
          </Field>

          <Field
            label="Slack or Discord webhook"
            htmlFor="webhookUrl"
            error={errors.webhookUrl}
            hint="We post here when an incident opens and when it resolves."
          >
            <Input
              id="webhookUrl"
              name="webhookUrl"
              type="url"
              defaultValue={v?.webhookUrl ?? defaults.webhookUrl ?? ""}
              placeholder="https://hooks.slack.com/services/…"
              className="tabular text-[13px]"
              aria-invalid={Boolean(errors.webhookUrl)}
            />
          </Field>
        </fieldset>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          <div className="min-h-5">
            <Notice state={testState.message || testState.error ? testState : state} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={disabled || testing || !defaults.webhookUrl}
              onClick={() => startTest(async () => setTestState(await testAction()))}
            >
              {testing ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Send className="size-4" aria-hidden />}
              Send test
            </Button>
            <Button type="submit" disabled={disabled || pending} onClick={() => setTestState({})}>
              {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              Save settings
            </Button>
          </div>
        </div>
      </form>
    </Card>
  );
}

export function InviteForm({ action }: { action: (state: FormState & { link?: string }, formData: FormData) => Promise<FormState & { link?: string }> }) {
  const [state, formAction, pending] = useActionState(action, {});
  const [copied, setCopied] = useState(false);
  const fullLink = state.link ? `${typeof window === "undefined" ? "" : window.location.origin}${state.link}` : "";

  return (
    <form action={formAction} className="grid gap-3">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[160px] flex-1">
          <Field label="Invite someone as" htmlFor="role">
            <Select id="role" name="role" defaultValue="member">
              <option value="member">Member: can manage monitors</option>
              <option value="admin">Admin: also settings and members</option>
              <option value="viewer">Viewer: read-only</option>
            </Select>
          </Field>
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          Create invite link
        </Button>
      </div>
      {state.error ? <Notice state={state} /> : null}
      {state.link ? (
        <div className="rise-in grid gap-2 rounded-[var(--radius-ctl)] border border-pen/30 bg-pen-soft/40 p-3">
          <p className="text-[12.5px] text-ink-2">{state.message}</p>
          <div className="flex gap-2">
            <Input readOnly value={fullLink} className="tabular text-[12px]" onFocus={(event) => event.currentTarget.select()} aria-label="Invite link" />
            <Button
              type="button"
              variant="secondary"
              onClick={async () => {
                await navigator.clipboard.writeText(fullLink);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
            >
              {copied ? <Check className="size-4 text-up" aria-hidden /> : <Copy className="size-4" aria-hidden />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>
      ) : null}
    </form>
  );
}

export function RemoveButton({ action, label, icon = "user" }: { action: () => Promise<FormState>; label: string; icon?: "user" | "trash" }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="inline-flex items-center gap-2">
      {error ? <span className="text-[12px] text-down">{error}</span> : null}
      <button
        type="button"
        disabled={pending}
        aria-label={label}
        title={label}
        onClick={() =>
          startTransition(async () => {
            const result = await action();
            setError(result?.error ?? null);
          })
        }
        className="grid size-8 place-items-center rounded-md text-ink-3 transition-colors hover:bg-down-soft hover:text-down disabled:opacity-50"
      >
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : icon === "user" ? <UserMinus className="size-4" aria-hidden /> : <Trash2 className="size-4" aria-hidden />}
      </button>
    </span>
  );
}

export function DangerZone({
  slug,
  isOwner,
  deleteAction,
  leaveAction,
}: {
  slug: string;
  isOwner: boolean;
  deleteAction: (state: FormState, formData: FormData) => Promise<FormState>;
  leaveAction: () => Promise<FormState>;
}) {
  const [state, formAction, pending] = useActionState(deleteAction, {});
  const [leaveState, setLeaveState] = useState<FormState>({});
  const [leaving, startLeave] = useTransition();

  return (
    <section className="rounded-[var(--radius-card)] border border-down/30 bg-surface p-5 sm:p-6">
      <h2 className="text-[15px] font-semibold text-down">Danger zone</h2>
      {isOwner ? (
        <form action={formAction} className="mt-3 grid gap-3">
          <p className="text-[13.5px] text-ink-2">
            Deleting the workspace removes every monitor, check, incident and member. Type <span className="tabular font-semibold text-ink">{slug}</span> to confirm.
          </p>
          <div className="flex flex-wrap gap-2">
            <Input name="confirm" autoComplete="off" placeholder={slug} className="max-w-xs tabular text-[13px]" aria-label="Workspace slug" />
            <Button type="submit" variant="danger" disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Trash2 className="size-4" aria-hidden />}
              Delete workspace
            </Button>
          </div>
          {state.fieldErrors?.confirm ? <p className="text-[13px] text-down">{state.fieldErrors.confirm}</p> : <Notice state={state} />}
        </form>
      ) : (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[13.5px] text-ink-2">Leave this workspace. You&apos;ll need a new invite to come back.</p>
          <Button variant="danger" disabled={leaving} onClick={() => startLeave(async () => setLeaveState(await leaveAction()))}>
            Leave workspace
          </Button>
          <Notice state={leaveState} />
        </div>
      )}
    </section>
  );
}
