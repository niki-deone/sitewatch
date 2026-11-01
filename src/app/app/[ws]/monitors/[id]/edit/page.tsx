// src/app/app/[ws]/monitors/[id]/edit/page.tsx
import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getWorkspaceMonitor, requireWorkspace } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { deleteMonitor, updateMonitor } from "@/lib/actions/monitors";
import { PageHeader } from "@/components/page-header";
import { MonitorForm } from "@/components/monitor-form";
import { DeleteMonitorButton } from "@/components/monitor-actions";

export const metadata: Metadata = { title: "Edit monitor" };

export default async function EditMonitorPage({ params }: { params: Promise<{ ws: string; id: string }> }) {
  const { ws, id } = await params;
  const { workspace, role } = await requireWorkspace(ws);
  const monitor = await getWorkspaceMonitor(workspace.id, id);
  if (!monitor) notFound();
  const detailHref = `/app/${workspace.slug}/monitors/${monitor.id}`;
  if (!can(role, "monitor:write")) redirect(detailHref);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow={
          <Link href={detailHref} className="hover:text-ink">
            ← {monitor.name}
          </Link>
        }
        title="Edit monitor"
      />
      <MonitorForm action={updateMonitor.bind(null, workspace.slug, monitor.id)} defaults={monitor} submitLabel="Save changes" cancelHref={detailHref} />

      <section className="mt-10 rounded-[var(--radius-card)] border border-down/30 bg-surface p-5 sm:p-6">
        <h2 className="text-[15px] font-semibold text-down">Delete monitor</h2>
        <p className="mt-1 text-[13.5px] text-ink-2">Removes the monitor, its check history and incidents. This can&apos;t be undone.</p>
        <div className="mt-4">
          <DeleteMonitorButton action={deleteMonitor.bind(null, workspace.slug, monitor.id)} name={monitor.name} />
        </div>
      </section>
    </div>
  );
}
