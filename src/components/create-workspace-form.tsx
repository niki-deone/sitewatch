// src/components/create-workspace-form.tsx
"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import type { FormState } from "@/lib/validation";
import { Button, Field, Input } from "@/components/ui";

export function CreateWorkspaceForm({ action }: { action: (state: FormState, formData: FormData) => Promise<FormState> }) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="grid gap-4">
      <Field label="Workspace name" htmlFor="name" error={state.fieldErrors?.name ?? state.error} hint="Usually your company, client or project.">
        <Input id="name" name="name" defaultValue={state.values?.name ?? ""} placeholder="Acme Inc" autoFocus maxLength={50} aria-invalid={Boolean(state.fieldErrors?.name)} />
      </Field>
      <Button type="submit" disabled={pending} size="lg">
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
        Create workspace
      </Button>
    </form>
  );
}
