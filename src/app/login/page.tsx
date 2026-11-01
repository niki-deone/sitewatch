// src/app/login/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Eye } from "lucide-react";
import { demoEnabled, githubEnabled } from "@/auth";
import { getCurrentUser } from "@/lib/dal";
import { signInAsDemo, signInWithGithub } from "@/lib/actions/auth";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui";
import { RecorderTrace } from "@/components/landing/recorder-trace";

export const metadata: Metadata = { title: "Sign in" };

function GithubIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-4" fill="currentColor" aria-hidden>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

const errorMessages: Record<string, string> = {
  Configuration: "Sign-in isn't configured on this server yet. Check the GitHub OAuth environment variables.",
  AccessDenied: "Access was denied.",
  CredentialsSignin: "The demo account isn't available. Run the seed script to create it.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string; error?: string }> }) {
  const { callbackUrl, error } = await searchParams;
  if (await getCurrentUser()) redirect(callbackUrl?.startsWith("/") && !callbackUrl.startsWith("//") ? callbackUrl : "/app");

  return (
    <main className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <section className="flex flex-col px-6 py-8 sm:px-12">
        <Logo />
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">
          <h1 className="display text-[36px]">Sign in to SiteWatch</h1>
          <p className="mt-2 text-[15px] text-ink-2">Your monitors, incidents and status page in one place.</p>

          {error ? (
            <p role="alert" className="mt-6 rounded-[var(--radius-ctl)] border border-down/40 bg-down-soft px-4 py-3 text-[13.5px] text-down">
              {errorMessages[error] ?? "Something went wrong while signing in. Try again."}
            </p>
          ) : null}

          <div className="mt-8 grid gap-3">
            {githubEnabled ? (
              <form action={signInWithGithub}>
                <input type="hidden" name="callbackUrl" value={callbackUrl ?? "/app"} />
                <Button type="submit" size="lg" className="w-full">
                  <GithubIcon /> Continue with GitHub
                </Button>
              </form>
            ) : (
              <p className="rounded-[var(--radius-ctl)] border border-dashed border-line-strong px-4 py-3 text-[13px] text-ink-3">
                GitHub sign-in is turned off on this deployment.
              </p>
            )}

            {demoEnabled ? (
              <>
                <div className="flex items-center gap-3 text-[12px] text-ink-3">
                  <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
                </div>
                <form action={signInAsDemo}>
                  <Button type="submit" size="lg" variant="secondary" className="w-full">
                    <Eye className="size-4" aria-hidden /> Explore the live demo
                  </Button>
                </form>
                <p className="text-center text-[12.5px] text-ink-3">Read-only workspace with real monitors. No account needed.</p>
              </>
            ) : null}
          </div>

          <p className="mt-10 text-[12.5px] text-ink-3">
            We only read your public GitHub name, email and avatar.{" "}
            <Link href="/" className="text-pen hover:underline">
              Back to home
            </Link>
          </p>
        </div>
      </section>

      <aside className="relative hidden overflow-hidden bg-surface-2 lg:block" aria-hidden>
        <div className="absolute inset-0 flex flex-col justify-center gap-10 px-14">
          <RecorderTrace className="h-[220px] w-full" />
          <div className="max-w-md">
            <p className="text-[13px] text-ink-3">api.acme.dev · checked every 5 minutes</p>
            <p className="display mt-3 text-[32px]">
              Hear about the outage from your monitor, not from a customer.
            </p>
          </div>
        </div>
      </aside>
    </main>
  );
}
