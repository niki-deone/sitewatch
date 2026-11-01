// src/app/app/[ws]/layout.tsx
import Link from "next/link";
import { and, count, eq, isNull } from "drizzle-orm";
import { Eye, Globe, LogOut } from "lucide-react";
import { db, schema } from "@/db";
import { signOutAction } from "@/lib/actions/auth";
import { listUserWorkspaces, requireWorkspace } from "@/lib/dal";
import { LogoMark } from "@/components/logo";
import { NavLinks } from "@/components/app-shell/nav-links";
import { UserMenu } from "@/components/app-shell/user-menu";
import { WorkspaceSwitcher } from "@/components/app-shell/workspace-switcher";

export default async function WorkspaceLayout({ children, params }: { children: React.ReactNode; params: Promise<{ ws: string }> }) {
  const { ws } = await params;
  const { user, workspace, role } = await requireWorkspace(ws);
  const [workspaces, [openIncidents]] = await Promise.all([
    listUserWorkspaces(user.id),
    db
      .select({ value: count() })
      .from(schema.incidents)
      .where(and(eq(schema.incidents.workspaceId, workspace.id), isNull(schema.incidents.resolvedAt))),
  ]);
  const current = { slug: workspace.slug, name: workspace.name, role };

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <aside className="hidden w-[260px] shrink-0 flex-col gap-5 border-r border-line bg-paper px-3 py-4 lg:sticky lg:top-0 lg:flex lg:h-dvh">
        <Link href="/" className="flex items-center gap-2 px-1.5" aria-label="SiteWatch home">
          <LogoMark size={26} />
          <span className="text-[16px] font-semibold tracking-tight">SiteWatch</span>
        </Link>
        <WorkspaceSwitcher current={current} workspaces={workspaces} canCreate={!user.isDemo} />
        <NavLinks slug={workspace.slug} openIncidents={openIncidents?.value ?? 0} />
        {workspace.statusPagePublic ? (
          <Link
            href={`/status/${workspace.slug}`}
            target="_blank"
            className="flex items-center gap-2.5 rounded-[var(--radius-ctl)] px-2.5 py-2 text-[13px] text-ink-2 hover:bg-surface/70 hover:text-ink"
          >
            <Globe className="size-4 text-ink-3" aria-hidden />
            Public status page
          </Link>
        ) : null}
        <div className="mt-auto grid gap-3">
          {user.isDemo ? (
            <div className="rounded-[var(--radius-card)] border border-line bg-surface p-3 text-[12.5px] leading-relaxed text-ink-2">
              <div className="mb-1 flex items-center gap-1.5 font-semibold text-ink">
                <Eye className="size-3.5" aria-hidden /> Read-only demo
              </div>
              Real checks, real data, but nothing can be changed here.{" "}
              <Link href="/login" className="font-medium text-pen underline-offset-2 hover:underline">
                Use GitHub
              </Link>{" "}
              for your own workspace.
            </div>
          ) : null}
          <div className="border-t border-line pt-3">
            <UserMenu user={user} />
          </div>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur lg:hidden">
        <div className="flex items-center gap-3 px-4 pb-2 pt-3">
          <Link href="/" aria-label="SiteWatch home">
            <LogoMark size={26} />
          </Link>
          <div className="min-w-0 flex-1">
            <WorkspaceSwitcher current={current} workspaces={workspaces} canCreate={!user.isDemo} />
          </div>
          <form action={signOutAction}>
            <button
              type="submit"
              aria-label="Sign out"
              className="grid size-10 place-items-center rounded-[var(--radius-ctl)] border border-line bg-surface text-ink-3 shadow-card hover:text-ink"
            >
              <LogOut className="size-4" aria-hidden />
            </button>
          </form>
        </div>
        <div className="px-3 pb-2">
          <NavLinks slug={workspace.slug} openIncidents={openIncidents?.value ?? 0} orientation="horizontal" />
        </div>
        {user.isDemo ? (
          <div className="border-t border-line bg-pen-soft/50 px-4 py-1.5 text-[12px] text-ink-2">
            <Eye className="mr-1 inline size-3.5 align-[-2px]" aria-hidden />
            Read-only demo.{" "}
            <Link href="/login" className="font-medium text-pen">
              Sign in with GitHub
            </Link>{" "}
            for your own.
          </div>
        ) : null}
      </header>

      <main className="graph-paper min-w-0 flex-1">
        <div className="mx-auto w-full max-w-[1180px] px-4 py-6 sm:px-6 lg:px-10 lg:py-9">{children}</div>
      </main>
    </div>
  );
}
