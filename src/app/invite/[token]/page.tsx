// src/app/invite/[token]/page.tsx
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentUser } from "@/lib/dal";
import { acceptInvite } from "@/lib/actions/workspace";
import { roleLabels } from "@/lib/permissions";
import { Logo } from "@/components/logo";
import { Card, ButtonLink } from "@/components/ui";
import { AcceptInviteButton } from "@/components/accept-invite-button";

export const metadata: Metadata = { title: "Join workspace", robots: { index: false } };

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?callbackUrl=${encodeURIComponent(`/invite/${token}`)}`);

  const [invite] = await db
    .select({ role: schema.invites.role, workspaceName: schema.workspaces.name })
    .from(schema.invites)
    .innerJoin(schema.workspaces, eq(schema.workspaces.id, schema.invites.workspaceId))
    .where(and(eq(schema.invites.token, token), isNull(schema.invites.usedAt), sql`${schema.invites.expiresAt} > now()`))
    .limit(1);

  return (
    <main className="graph-paper grid min-h-dvh place-items-center px-4 py-12">
      <div className="w-full max-w-md">
        <Logo className="mb-8" />
        <Card className="p-6 sm:p-8">
          {invite ? (
            <>
              <h1 className="text-[22px] font-semibold tracking-tight">Join {invite.workspaceName}</h1>
              <p className="mt-1 mb-6 text-[14px] text-ink-2">
                You&apos;ve been invited as <strong>{roleLabels[invite.role]}</strong>. You&apos;re signed in as {user.name}.
              </p>
              <AcceptInviteButton action={acceptInvite.bind(null, token)} />
            </>
          ) : (
            <>
              <h1 className="text-[22px] font-semibold tracking-tight">Invite not valid</h1>
              <p className="mt-1 mb-6 text-[14px] text-ink-2">This link has expired, was already used or never existed. Ask for a new one.</p>
              <ButtonLink href="/app" variant="secondary">
                Go to dashboard
              </ButtonLink>
            </>
          )}
        </Card>
      </div>
    </main>
  );
}
