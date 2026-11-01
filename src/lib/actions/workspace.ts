// src/lib/actions/workspace.ts
"use server";

import { and, eq, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, schema } from "@/db";
import type { Role } from "@/db/schema";
import { PermissionError, requirePermission, requireUser, requireWorkspace } from "@/lib/dal";
import { sendWebhook } from "@/lib/monitoring/notify";
import { randomSuffix, randomToken, slugify } from "@/lib/slug";
import { fieldErrorsFrom, formValues, workspaceNameInput, workspaceSettingsInput, type FormState } from "@/lib/validation";

function permissionState(error: unknown): FormState {
  if (error instanceof PermissionError) return { error: error.message };
  throw error;
}

export async function updateWorkspaceSettings(slug: string, _prev: FormState, formData: FormData): Promise<FormState> {
  let ctx;
  try {
    ctx = await requirePermission(slug, "workspace:settings");
  } catch (error) {
    return permissionState(error);
  }

  const parsed = workspaceSettingsInput.safeParse({
    name: formData.get("name") ?? "",
    statusPagePublic: formData.get("statusPagePublic") === "on",
    statusPageTitle: formData.get("statusPageTitle") ?? "",
    webhookUrl: formData.get("webhookUrl") ?? "",
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error), values: formValues(formData) };

  await db.update(schema.workspaces).set(parsed.data).where(eq(schema.workspaces.id, ctx.workspace.id));
  revalidatePath(`/app/${slug}`, "layout");
  revalidatePath(`/status/${slug}`);
  return { ok: true, message: "Settings saved." };
}

export async function sendTestNotification(slug: string): Promise<FormState> {
  let ctx;
  try {
    ctx = await requirePermission(slug, "workspace:settings");
  } catch (error) {
    return permissionState(error);
  }
  if (!ctx.workspace.webhookUrl) return { error: "Save a webhook URL first." };
  const result = await sendWebhook(ctx.workspace.webhookUrl, {
    kind: "test",
    workspaceName: ctx.workspace.name,
    monitorName: "",
    monitorUrl: "",
  });
  return result.ok ? { ok: true, message: "Test message sent. Check your channel." } : { error: result.error ?? "Webhook failed." };
}

const INVITE_TTL_DAYS = 7;

export async function createInvite(slug: string, _prev: FormState, formData: FormData): Promise<FormState & { link?: string }> {
  let ctx;
  try {
    ctx = await requirePermission(slug, "workspace:members");
  } catch (error) {
    return permissionState(error);
  }
  const roleValue = formData.get("role");
  const role: Role = roleValue === "admin" || roleValue === "viewer" ? roleValue : "member";

  const token = randomToken();
  await db.insert(schema.invites).values({
    workspaceId: ctx.workspace.id,
    token,
    role,
    createdBy: ctx.user.id,
    expiresAt: new Date(Date.now() + INVITE_TTL_DAYS * 86_400_000),
  });
  revalidatePath(`/app/${slug}/settings`);
  return { ok: true, message: `Invite link created. It works once and expires in ${INVITE_TTL_DAYS} days.`, link: `/invite/${token}` };
}

export async function revokeInvite(slug: string, inviteId: string): Promise<FormState> {
  let ctx;
  try {
    ctx = await requirePermission(slug, "workspace:members");
  } catch (error) {
    return permissionState(error);
  }
  await db
    .delete(schema.invites)
    .where(and(eq(schema.invites.id, inviteId), eq(schema.invites.workspaceId, ctx.workspace.id)));
  revalidatePath(`/app/${slug}/settings`);
  return { ok: true };
}

export async function removeMember(slug: string, userId: string): Promise<FormState> {
  let ctx;
  try {
    ctx = await requirePermission(slug, "workspace:members");
  } catch (error) {
    return permissionState(error);
  }
  const target = await db.query.memberships.findFirst({
    where: and(eq(schema.memberships.workspaceId, ctx.workspace.id), eq(schema.memberships.userId, userId)),
  });
  if (!target) return { error: "Member not found." };
  if (target.role === "owner") return { error: "The owner can't be removed." };
  if (ctx.role === "admin" && target.role === "admin" && userId !== ctx.user.id) {
    return { error: "Admins can't remove other admins." };
  }

  await db
    .delete(schema.memberships)
    .where(and(eq(schema.memberships.workspaceId, ctx.workspace.id), eq(schema.memberships.userId, userId)));
  revalidatePath(`/app/${slug}/settings`);
  return { ok: true };
}

export async function leaveWorkspace(slug: string): Promise<FormState> {
  const ctx = await requireWorkspace(slug);
  if (ctx.role === "owner") return { error: "Owners can't leave their own workspace. Delete it instead." };
  if (ctx.user.isDemo) return { error: "The demo account can't leave the demo workspace." };
  await db
    .delete(schema.memberships)
    .where(and(eq(schema.memberships.workspaceId, ctx.workspace.id), eq(schema.memberships.userId, ctx.user.id)));
  redirect("/app");
}

export async function deleteWorkspace(slug: string, _prev: FormState, formData: FormData): Promise<FormState> {
  let ctx;
  try {
    ctx = await requirePermission(slug, "workspace:delete");
  } catch (error) {
    return permissionState(error);
  }
  if (formData.get("confirm") !== ctx.workspace.slug) {
    return { fieldErrors: { confirm: `Type ${ctx.workspace.slug} to confirm.` } };
  }
  await db.delete(schema.workspaces).where(eq(schema.workspaces.id, ctx.workspace.id));
  redirect("/app");
}

export async function createWorkspace(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  if (user.isDemo) return { error: "The demo account is read-only. Sign in with GitHub to create your own workspace." };

  const parsed = workspaceNameInput.safeParse(formData.get("name") ?? "");
  if (!parsed.success) return { fieldErrors: { name: parsed.error.issues[0]?.message ?? "Invalid name" }, values: formValues(formData) };

  const [owned] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(schema.memberships)
    .where(and(eq(schema.memberships.userId, user.id), eq(schema.memberships.role, "owner")));
  if ((owned?.value ?? 0) >= 5) return { error: "You can own up to 5 workspaces." };

  const slug = `${slugify(parsed.data)}-${randomSuffix()}`;
  await db.transaction(async (tx) => {
    const [workspace] = await tx.insert(schema.workspaces).values({ name: parsed.data, slug }).returning({ id: schema.workspaces.id });
    await tx.insert(schema.memberships).values({ workspaceId: workspace.id, userId: user.id, role: "owner" });
  });
  redirect(`/app/${slug}`);
}

/** Accepts an invite. Done inside a transaction so a token can only ever be used once. */
export async function acceptInvite(token: string): Promise<FormState> {
  const user = await requireUser();
  if (user.isDemo) return { error: "Sign in with GitHub to join a workspace. The demo account can't accept invites." };

  const outcome = await db.transaction(async (tx) => {
    const [invite] = await tx
      .update(schema.invites)
      .set({ usedAt: new Date() })
      .where(and(eq(schema.invites.token, token), isNull(schema.invites.usedAt), sql`${schema.invites.expiresAt} > now()`))
      .returning();
    if (!invite) return { error: "This invite is invalid, expired or already used." } as const;

    const workspace = await tx.query.workspaces.findFirst({ where: eq(schema.workspaces.id, invite.workspaceId) });
    if (!workspace) return { error: "This workspace no longer exists." } as const;

    await tx
      .insert(schema.memberships)
      .values({ workspaceId: invite.workspaceId, userId: user.id, role: invite.role })
      .onConflictDoNothing();
    return { slug: workspace.slug } as const;
  });

  if ("error" in outcome) return { error: outcome.error };
  redirect(`/app/${outcome.slug}`);
}
