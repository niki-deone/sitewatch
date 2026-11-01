// src/lib/dal.ts
// Data Access Layer: every page and action resolves the user and workspace here,
// so authorization lives in one place instead of being scattered across the UI.
import "server-only";
import { cache } from "react";
import { and, asc, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { db, schema } from "@/db";
import type { Role } from "@/db/schema";
import { can, type Action } from "./permissions";

export type CurrentUser = {
  id: string;
  name: string;
  email: string | null;
  image: string | null;
  isDemo: boolean;
};

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  const user = await db.query.users.findFirst({ where: eq(schema.users.id, id) });
  if (!user) return null;
  return { id: user.id, name: user.name, email: user.email, image: user.image, isDemo: user.isDemo };
});

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export const listUserWorkspaces = cache(async (userId: string) => {
  return db
    .select({
      id: schema.workspaces.id,
      name: schema.workspaces.name,
      slug: schema.workspaces.slug,
      role: schema.memberships.role,
    })
    .from(schema.memberships)
    .innerJoin(schema.workspaces, eq(schema.workspaces.id, schema.memberships.workspaceId))
    .where(eq(schema.memberships.userId, userId))
    .orderBy(asc(schema.memberships.createdAt));
});

export type WorkspaceContext = {
  user: CurrentUser;
  workspace: typeof schema.workspaces.$inferSelect;
  role: Role;
};

/** Resolves a workspace by slug and proves the current user is a member. Non-members get a 404, not a 403, so slugs don't leak. */
export const requireWorkspace = cache(async (slug: string): Promise<WorkspaceContext> => {
  const user = await requireUser();
  const rows = await db
    .select({ workspace: schema.workspaces, role: schema.memberships.role })
    .from(schema.workspaces)
    .innerJoin(
      schema.memberships,
      and(eq(schema.memberships.workspaceId, schema.workspaces.id), eq(schema.memberships.userId, user.id)),
    )
    .where(eq(schema.workspaces.slug, slug))
    .limit(1);

  const row = rows[0];
  if (!row) notFound();
  return { user, workspace: row.workspace, role: row.role };
});

export class PermissionError extends Error {
  constructor(message = "You don't have permission to do that.") {
    super(message);
    this.name = "PermissionError";
  }
}

/** Same as requireWorkspace, but also checks the role is allowed to perform the action. Used by Server Actions. */
export async function requirePermission(slug: string, action: Action): Promise<WorkspaceContext> {
  const ctx = await requireWorkspace(slug);
  if (!can(ctx.role, action)) {
    throw new PermissionError(
      ctx.user.isDemo
        ? "The demo account is read-only. Sign in with GitHub to create your own workspace."
        : "Your role in this workspace doesn't allow this.",
    );
  }
  return ctx;
}

/** Loads a monitor only if it belongs to the given workspace. This is the tenant isolation check for monitor routes. */
export async function getWorkspaceMonitor(workspaceId: string, monitorId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(monitorId)) return null;
  const monitor = await db.query.monitors.findFirst({
    where: and(eq(schema.monitors.id, monitorId), eq(schema.monitors.workspaceId, workspaceId)),
  });
  return monitor ?? null;
}
