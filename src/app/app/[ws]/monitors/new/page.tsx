// src/app/app/[ws]/monitors/new/page.tsx
import Link from "next/link";
import type { Metadata } from "next";
import { Lock } from "lucide-react";
import { requireWorkspace } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { createMonitor } from "@/lib/actions/monitors";
import { PageHeader } from "@/components/page-header";
import { EmptyState, ButtonLink } from "@/components/ui";
import { emptyMonitor, MonitorForm } from "@/components/monitor-form";

export const metadata: Metadata = { title: "New monitor" };

export default async function NewMonitorPage({ params }: { params: Promise<{ ws: string }> }) {
  const { ws } = await params;
  const { workspace, role, user } = await requireWorkspace(ws);
  const base = `/app/${workspace.slug}`;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow={
          <Link href={base} className="hover:text-ink">
            ← Overview
          </Link>
        }
        title="New monitor"
        description="We'll check this URL on a schedule, retry once before alerting and keep 90 days of history."
      />
      {can(role, "monitor:write") ? (
        <MonitorForm action={createMonitor.bind(null, workspace.slug)} defaults={emptyMonitor} submitLabel="Create monitor" cancelHref={base} />
      ) : (
        <EmptyState
          icon={<Lock className="size-7 text-ink-3" aria-hidden />}
          title={user.isDemo ? "The demo is read-only" : "You can't create monitors here"}
          description={user.isDemo ? "Sign in with GitHub to get your own workspace and add real monitors." : "Ask an owner or admin of this workspace to change your role."}
          action={user.isDemo ? <ButtonLink href="/login">Sign in with GitHub</ButtonLink> : null}
        />
      )}
    </div>
  );
}
