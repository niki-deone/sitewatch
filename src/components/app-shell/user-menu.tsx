// src/components/app-shell/user-menu.tsx
import Image from "next/image";
import { LogOut } from "lucide-react";
import { signOutAction } from "@/lib/actions/auth";
import type { CurrentUser } from "@/lib/dal";

export function UserMenu({ user }: { user: CurrentUser }) {
  return (
    <div className="flex items-center gap-2.5 rounded-[var(--radius-ctl)] px-1 py-1">
      {user.image ? (
        <Image src={user.image} alt="" width={30} height={30} className="size-[30px] rounded-full border border-line" />
      ) : (
        <span className="grid size-[30px] place-items-center rounded-full bg-ink tabular text-[12px] text-paper">
          {user.name.slice(0, 1).toUpperCase()}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-medium">{user.name}</div>
        <div className="truncate text-[11.5px] text-ink-3">{user.isDemo ? "Demo account" : (user.email ?? "GitHub")}</div>
      </div>
      <form action={signOutAction}>
        <button
          type="submit"
          className="grid size-8 place-items-center rounded-md text-ink-3 transition-colors hover:bg-surface hover:text-ink"
          aria-label="Sign out"
          title="Sign out"
        >
          <LogOut className="size-4" aria-hidden />
        </button>
      </form>
    </div>
  );
}
