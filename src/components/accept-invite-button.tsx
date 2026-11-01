// src/components/accept-invite-button.tsx
"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import type { FormState } from "@/lib/validation";
import { Button } from "@/components/ui";

export function AcceptInviteButton({ action }: { action: () => Promise<FormState> }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="grid gap-3">
      <Button size="lg" disabled={pending} onClick={() => startTransition(async () => setError((await action())?.error ?? null))}>
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
        Accept invite
      </Button>
      {error ? (
        <p role="alert" className="text-[13px] text-down">
          {error}
        </p>
      ) : null}
    </div>
  );
}
