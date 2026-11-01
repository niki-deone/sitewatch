// src/app/app/new/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { listUserWorkspaces, requireUser } from "@/lib/dal";
import { createWorkspace } from "@/lib/actions/workspace";
import { Logo } from "@/components/logo";
import { Card, ButtonLink } from "@/components/ui";
import { CreateWorkspaceForm } from "@/components/create-workspace-form";

export const metadata: Metadata = { title: "New workspace" };

export default async function NewWorkspacePage() {
  const user = await requireUser();
  const workspaces = await listUserWorkspaces(user.id);

  return (
    <main className="graph-paper grid min-h-dvh place-items-center px-4 py-12">
      <div className="w-full max-w-md">
        <Logo className="mb-8" />
        <Card className="p-6 sm:p-8">
          <h1 className="text-[22px] font-semibold tracking-tight">Create a workspace</h1>
          <p className="mt-1 mb-6 text-[14px] text-ink-2">A workspace holds monitors, incidents, a status page and the people who share them.</p>
          {user.isDemo ? (
            <div className="grid gap-4">
              <p className="text-[14px] text-ink-2">The demo account is read-only. Sign in with GitHub to create your own workspace.</p>
              <ButtonLink href="/login">Sign in with GitHub</ButtonLink>
            </div>
          ) : (
            <CreateWorkspaceForm action={createWorkspace} />
          )}
        </Card>
        {workspaces.length ? (
          <p className="mt-4 text-center text-[13px] text-ink-3">
            or go back to{" "}
            <Link href={`/app/${workspaces[0].slug}`} className="text-pen hover:underline">
              {workspaces[0].name}
            </Link>
          </p>
        ) : null}
      </div>
    </main>
  );
}
