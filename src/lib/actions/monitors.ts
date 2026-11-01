// src/lib/actions/monitors.ts
"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, schema } from "@/db";
import { getWorkspaceMonitor, PermissionError, requirePermission } from "@/lib/dal";
import { runMonitor } from "@/lib/monitoring/runner";
import { assertPublicUrl, BlockedTargetError } from "@/lib/monitoring/url-guard";
import { countMonitors } from "@/lib/queries";
import { fieldErrorsFrom, formValues, MAX_MONITORS_PER_WORKSPACE, readMonitorForm, type FormState } from "@/lib/validation";

function permissionState(error: unknown): FormState {
  if (error instanceof PermissionError) return { error: error.message };
  throw error;
}

async function validateTarget(url: string): Promise<string | null> {
  try {
    await assertPublicUrl(url);
    return null;
  } catch (error) {
    if (error instanceof BlockedTargetError) return error.message;
    return "We couldn't resolve this host. Check the address.";
  }
}

export async function createMonitor(slug: string, _prev: FormState, formData: FormData): Promise<FormState> {
  let ctx;
  try {
    ctx = await requirePermission(slug, "monitor:write");
  } catch (error) {
    return permissionState(error);
  }

  const parsed = readMonitorForm(formData);
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error), values: formValues(formData) };

  const targetError = await validateTarget(parsed.data.url);
  if (targetError) return { fieldErrors: { url: targetError }, values: formValues(formData) };

  if ((await countMonitors(ctx.workspace.id)) >= MAX_MONITORS_PER_WORKSPACE) {
    return { error: `A workspace can have up to ${MAX_MONITORS_PER_WORKSPACE} monitors.`, values: formValues(formData) };
  }

  const [monitor] = await db
    .insert(schema.monitors)
    .values({ ...parsed.data, workspaceId: ctx.workspace.id })
    .returning();

  // Run the first check right away so the new monitor never sits in "pending".
  await runMonitor(monitor).catch((error) => console.error("[sitewatch] first check failed", error));

  revalidatePath(`/app/${slug}`);
  redirect(`/app/${slug}/monitors/${monitor.id}`);
}

export async function updateMonitor(slug: string, monitorId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  let ctx;
  try {
    ctx = await requirePermission(slug, "monitor:write");
  } catch (error) {
    return permissionState(error);
  }

  const monitor = await getWorkspaceMonitor(ctx.workspace.id, monitorId);
  if (!monitor) return { error: "Monitor not found." };

  const parsed = readMonitorForm(formData);
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error), values: formValues(formData) };

  if (parsed.data.url !== monitor.url) {
    const targetError = await validateTarget(parsed.data.url);
    if (targetError) return { fieldErrors: { url: targetError }, values: formValues(formData) };
  }

  await db
    .update(schema.monitors)
    .set({
      ...parsed.data,
      // A new URL means the old SSL data no longer applies.
      ...(parsed.data.url !== monitor.url ? { sslExpiresAt: null, sslCheckedAt: null, status: "pending" as const } : {}),
    })
    .where(and(eq(schema.monitors.id, monitor.id), eq(schema.monitors.workspaceId, ctx.workspace.id)));

  revalidatePath(`/app/${slug}`);
  redirect(`/app/${slug}/monitors/${monitor.id}`);
}

export async function deleteMonitor(slug: string, monitorId: string): Promise<FormState> {
  let ctx;
  try {
    ctx = await requirePermission(slug, "monitor:write");
  } catch (error) {
    return permissionState(error);
  }
  await db
    .delete(schema.monitors)
    .where(and(eq(schema.monitors.id, monitorId), eq(schema.monitors.workspaceId, ctx.workspace.id)));
  revalidatePath(`/app/${slug}`);
  redirect(`/app/${slug}`);
}

export async function togglePause(slug: string, monitorId: string): Promise<FormState> {
  let ctx;
  try {
    ctx = await requirePermission(slug, "monitor:write");
  } catch (error) {
    return permissionState(error);
  }
  const monitor = await getWorkspaceMonitor(ctx.workspace.id, monitorId);
  if (!monitor) return { error: "Monitor not found." };

  await db
    .update(schema.monitors)
    .set({ paused: !monitor.paused })
    .where(eq(schema.monitors.id, monitor.id));

  revalidatePath(`/app/${slug}`);
  revalidatePath(`/app/${slug}/monitors/${monitor.id}`);
  return { ok: true, message: monitor.paused ? "Monitoring resumed." : "Monitor paused." };
}

const RUN_NOW_COOLDOWN_MS = 20_000;

export async function runMonitorNow(slug: string, monitorId: string): Promise<FormState> {
  let ctx;
  try {
    ctx = await requirePermission(slug, "monitor:run");
  } catch (error) {
    return permissionState(error);
  }
  const monitor = await getWorkspaceMonitor(ctx.workspace.id, monitorId);
  if (!monitor) return { error: "Monitor not found." };

  if (monitor.lastCheckedAt && Date.now() - monitor.lastCheckedAt.getTime() < RUN_NOW_COOLDOWN_MS) {
    return { error: "Checked a few seconds ago. Try again shortly." };
  }

  const result = await runMonitor(monitor);
  revalidatePath(`/app/${slug}`);
  revalidatePath(`/app/${slug}/monitors/${monitor.id}`);
  return {
    ok: result.status !== "down",
    message:
      result.status === "down"
        ? `Down: ${result.error ?? "check failed"}`
        : `${result.status === "up" ? "Up" : "Degraded"} in ${result.latencyMs} ms (HTTP ${result.statusCode})`,
  };
}
