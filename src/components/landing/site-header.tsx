// src/components/landing/site-header.tsx
import Image from "next/image";
import Link from "next/link";
import { getCurrentUser } from "@/lib/dal";
import { Logo } from "@/components/logo";
import { ButtonLink } from "@/components/ui";

const GITHUB_URL = "https://github.com/niki-deone/sitewatch";

/** Marketing header. Knows whether you are signed in, so it offers the dashboard instead of "Log in". */
export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-40 bg-paper/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />
        <nav aria-label="Main" className="hidden items-center gap-8 text-[14.5px] font-medium text-ink-2 md:flex">
          <a href="#features" className="hover:text-ink">
            Product
          </a>
          <Link href="/status/demo" className="hover:text-ink">
            Status page
          </Link>
          <a href={GITHUB_URL} className="hover:text-ink" target="_blank" rel="noreferrer">
            GitHub
          </a>
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <span className="hidden items-center gap-2 text-[13.5px] text-ink-2 sm:flex">
                {user.image ? (
                  <Image src={user.image} alt="" width={26} height={26} className="size-[26px] rounded-full" />
                ) : (
                  <span className="grid size-[26px] place-items-center rounded-full bg-ink text-[11px] font-semibold text-paper">
                    {user.name.slice(0, 1).toUpperCase()}
                  </span>
                )}
                {user.isDemo ? "Demo" : user.name.split(" ")[0]}
              </span>
              <ButtonLink href="/app" size="sm">
                Open dashboard
              </ButtonLink>
            </>
          ) : (
            <>
              <ButtonLink href="/login" variant="ghost" size="sm" className="hidden sm:inline-flex">
                Log in
              </ButtonLink>
              <ButtonLink href="/login" size="sm">
                Start free
              </ButtonLink>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
