// src/components/monitor-actions.tsx
"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, Pause, Play, RefreshCw, Trash2 } from "lucide-react";
import type { FormState } from "@/lib/validation";
import { Button } from "@/components/ui";
import { cx } from "@/lib/cx";

function Toast({ state, onDone }: { state: FormState | null; onDone: () => void }) {
  useEffect(() => {
    if (!state) return;
    const timer = setTimeout(onDone, 5000);
    return () => clearTimeout(timer);
  }, [state, onDone]);
  if (!state || (!state.message && !state.error)) return null;
  const isError = Boolean(state.error) || state.ok === false;
  return (
    <div
      role="status"
      className={cx(
        "rise-in fixed bottom-5 left-1/2 z-50 w-[min(92vw,420px)] -translate-x-1/2 rounded-[var(--radius-card)] border px-4 py-3 text-[13.5px] shadow-pop",
        isError ? "border-down/40 bg-surface text-down" : "border-up/40 bg-surface text-up",
      )}
    >
      {state.error ?? state.message}
    </div>
  );
}

export function RunNowButton({ action }: { action: () => Promise<FormState> }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<FormState | null>(null);
  return (
    <>
      <Button
        variant="secondary"
        disabled={pending}
        onClick={() => startTransition(async () => setResult(await action()))}
      >
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <RefreshCw className="size-4" aria-hidden />}
        {pending ? "Checking…" : "Check now"}
      </Button>
      <Toast state={result} onDone={() => setResult(null)} />
    </>
  );
}

export function PauseButton({ action, paused }: { action: () => Promise<FormState>; paused: boolean }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<FormState | null>(null);
  return (
    <>
      <Button variant="secondary" disabled={pending} onClick={() => startTransition(async () => setResult(await action()))}>
        {paused ? <Play className="size-4" aria-hidden /> : <Pause className="size-4" aria-hidden />}
        {paused ? "Resume" : "Pause"}
      </Button>
      <Toast state={result} onDone={() => setResult(null)} />
    </>
  );
}

export function DeleteMonitorButton({ action, name }: { action: () => Promise<FormState>; name: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<FormState | null>(null);

  if (!confirming) {
    return (
      <Button variant="danger" onClick={() => setConfirming(true)}>
        <Trash2 className="size-4" aria-hidden /> Delete monitor
      </Button>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[13.5px] text-ink-2">Delete &ldquo;{name}&rdquo; for good?</span>
      <Button
        variant="danger"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const state = await action();
            if (state) setResult(state);
          })
        }
      >
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Trash2 className="size-4" aria-hidden />}
        Yes, delete
      </Button>
      <Button variant="ghost" onClick={() => setConfirming(false)}>
        Keep it
      </Button>
      <Toast state={result} onDone={() => setResult(null)} />
    </div>
  );
}
