// src/app/app/[ws]/settings/page.tsx
import Image from "next/image";
import type { Metadata } from "next";
import { requireWorkspace } from "@/lib/dal";
import { can, roleLabels } from "@/lib/permissions";
import { listActiveInvites, listMembers } from "@/lib/queries";
import {
  createInvite,
  deleteWorkspace,
  leaveWorkspace,
  removeMember,
  revokeInvite,
  sendTestNotification,
  updateWorkspaceSettings,
} from "@/lib/actions/workspace";
import { appUrl } from "@/lib/monitoring/runner";
import { timeAgo } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { Card, CardHeader } from "@/components/ui";
import { DangerZone, GeneralSettingsForm, InviteForm, RemoveButton } from "@/components/settings-forms";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage({ params }: { params: Promise<{ ws: string }> }) {
  const { ws } = await params;
  const { workspace, role, user } = await requireWorkspace(ws);
  const canManageMembers = can(role, "workspace:members");
  const [members, invites] = await Promise.all([listMembers(workspace.id), canManageMembers ? listActiveInvites(workspace.id) : Promise.resolve([])]);
  const statusPageUrl = `${appUrl() ?? ""}/status/${workspace.slug}`;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Settings" description={can(role, "workspace:settings") ? undefined : "Only owners and admins can change these settings."} />

      <div className="grid gap-6">
        <GeneralSettingsForm
          action={updateWorkspaceSettings.bind(null, workspace.slug)}
          testAction={sendTestNotification.bind(null, workspace.slug)}
          defaults={workspace}
          disabled={!can(role, "workspace:settings")}
          statusPageUrl={statusPageUrl}
        />

        <Card>
          <CardHeader title="Members" description={`${members.length} ${members.length === 1 ? "person has" : "people have"} access to ${workspace.name}.`} />
          <ul className="divide-y divide-line">
            {members.map((member) => (
              <li key={member.userId} className="flex items-center gap-3 px-5 py-3">
                {member.image ? (
                  <Image src={member.image} alt="" width={32} height={32} className="size-8 rounded-full border border-line" />
                ) : (
                  <span className="grid size-8 place-items-center rounded-full bg-ink tabular text-[12px] text-paper">{member.name.slice(0, 1).toUpperCase()}</span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-medium">
                    {member.name}
                    {member.userId === user.id ? <span className="ml-1.5 text-ink-3">(you)</span> : null}
                  </div>
                  <div className="truncate text-[12px] text-ink-3">{member.email ?? `joined ${timeAgo(member.joinedAt)}`}</div>
                </div>
                <span className="rounded-full border border-line px-2 py-0.5 text-[11.5px] text-ink-2">{roleLabels[member.role]}</span>
                {canManageMembers && member.role !== "owner" && member.userId !== user.id ? (
                  <RemoveButton action={removeMember.bind(null, workspace.slug, member.userId)} label={`Remove ${member.name}`} />
                ) : null}
              </li>
            ))}
          </ul>
          {canManageMembers ? (
            <div className="border-t border-line p-5">
              <InviteForm action={createInvite.bind(null, workspace.slug)} />
              {invites.length ? (
                <div className="mt-4">
                  <h3 className="text-[12px] font-medium uppercase tracking-wider text-ink-3">Pending invites</h3>
                  <ul className="mt-2 grid gap-1.5">
                    {invites.map((invite) => (
                      <li key={invite.id} className="flex items-center justify-between gap-3 rounded-md bg-surface-2 px-3 py-1.5 text-[13px]">
                        <span>
                          {roleLabels[invite.role]} invite, expires {invite.expiresAt.toISOString().slice(0, 10)}
                        </span>
                        <RemoveButton action={revokeInvite.bind(null, workspace.slug, invite.id)} label="Revoke invite" icon="trash" />
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
        </Card>

        {!user.isDemo ? (
          <DangerZone
            slug={workspace.slug}
            isOwner={role === "owner"}
            deleteAction={deleteWorkspace.bind(null, workspace.slug)}
            leaveAction={leaveWorkspace.bind(null, workspace.slug)}
          />
        ) : null}
      </div>
    </div>
  );
}
