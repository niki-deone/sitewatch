// src/app/app/[ws]/incidents/page.tsx
import Link from "next/link";
import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";
import { requireWorkspace } from "@/lib/dal";
import { listIncidents } from "@/lib/queries";
import { formatDateTime, hostOf } from "@/lib/format";
import { formatDuration } from "@/lib/monitoring/notify";
import { cx } from "@/lib/cx";
import { PageHeader } from "@/components/page-header";
import { Card, EmptyState, StatusPill } from "@/components/ui";

export const metadata: Metadata = { title: "Incidents" };

export default async function IncidentsPage({ params }: { params: Promise<{ ws: string }> }) {
  const { ws } = await params;
  const { workspace } = await requireWorkspace(ws);
  const incidents = await listIncidents(workspace.id);
  const open = incidents.filter((incident) => !incident.resolvedAt).length;

  return (
    <>
      <PageHeader
        title="Incidents"
        description={
          open
            ? `${open} ongoing. Incidents close automatically when the next check passes.`
            : "Every outage, when it started, what broke and how long it lasted."
        }
      />

      {incidents.length === 0 ? (
        <EmptyState
          icon={<CheckCircle2 className="size-8 text-up" aria-hidden />}
          title="No incidents"
          description="When a monitor fails a check and its retry, an incident shows up here and your webhook is notified."
        />
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-line">
            {incidents.map((incident) => {
              const end = incident.resolvedAt ?? new Date();
              return (
                <li key={incident.id}>
                  <Link
                    href={`/app/${workspace.slug}/monitors/${incident.monitorId}`}
                    className={cx(
                      "grid gap-2 px-5 py-4 transition-colors hover:bg-surface-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-6",
                      !incident.resolvedAt && "bg-down-soft/40",
                    )}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[14.5px] font-semibold">{incident.monitorName}</span>
                        <StatusPill status={incident.resolvedAt ? "up" : "down"} label={incident.resolvedAt ? "Resolved" : "Ongoing"} />
                      </div>
                      <div className="mt-1 text-[13px] text-ink-2">{incident.cause}</div>
                      <div className="mt-0.5 truncate font-mono text-[12px] text-ink-3">{hostOf(incident.monitorUrl)}</div>
                    </div>
                    <div className="flex gap-6 text-[12.5px] sm:text-right">
                      <div>
                        <div className="text-ink-3">Started</div>
                        <div className="font-mono tabular">{formatDateTime(incident.startedAt)}</div>
                      </div>
                      <div>
                        <div className="text-ink-3">Duration</div>
                        <div className="font-mono tabular">{formatDuration(end.getTime() - incident.startedAt.getTime())}</div>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </>
  );
}
