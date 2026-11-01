// src/app/page.tsx
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { demoEnabled } from "@/auth";
import { signInAsDemo } from "@/lib/actions/auth";
import { getCurrentUser } from "@/lib/dal";
import { Logo } from "@/components/logo";
import { Button, ButtonLink } from "@/components/ui";
import { SiteHeader } from "@/components/landing/site-header";
import { RotatingWord } from "@/components/landing/rotating-word";
import { ProductWindow } from "@/components/landing/product-window";
import { StatusPreview } from "@/components/landing/status-preview";
import { Reveal } from "@/components/landing/reveal";
import { BarsVisual, PipelineVisual, SslVisual, TeamVisual } from "@/components/landing/feature-visuals";

const GITHUB_URL = "https://github.com/niki-deone/sitewatch";

async function PrimaryActions() {
  const user = await getCurrentUser();
  
  if (user) {
    return (
      <div className="flex flex-wrap justify-center gap-3">
        <ButtonLink href="/app" size="lg">
          Open your dashboard <ArrowRight className="size-4" aria-hidden />
        </ButtonLink>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap justify-center gap-3">
      {demoEnabled ? (
        <form action={signInAsDemo}>
          <Button type="submit" size="lg">
            Try the live demo
          </Button>
        </form>
      ) : null}
      <ButtonLink href="/login" size="lg" variant="soft">
        Start free with GitHub
      </ButtonLink>
    </div>
  );
}

export default async function LandingPage() {
  return (
    <div className="min-h-dvh">
      <SiteHeader />

      <main>
        {/* Hero: one statement, one action, then the product itself. */}
        <section className="mx-auto max-w-[1200px] px-4 pt-16 text-center sm:px-6 sm:pt-24">
          <Reveal>
            <h1 className="display mx-auto text-[40px] sm:text-[54px] lg:text-[64px] xl:text-[72px]">
              Know it&apos;s down
              <br />
              <span className="xl:whitespace-nowrap">
                before your <RotatingWord /> do.
              </span>
            </h1>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mx-auto mt-6 max-w-[640px] text-[17px] leading-relaxed text-ink-2 sm:text-[19px]">
              SiteWatch checks your sites every few minutes, tells your team the moment one breaks and keeps a public status page honest.
            </p>
          </Reveal>
          <Reveal delay={0.18} className="mt-9">
            <PrimaryActions />
          </Reveal>

          <div className="mx-auto mt-16 max-w-[1080px] pb-6 text-left sm:mt-20">
            <ProductWindow />
          </div>
        </section>

        {/* Features, Notion-style: a big plain statement, then cards that show the real thing. */}
        <section id="features" className="mx-auto max-w-[1200px] scroll-mt-20 px-4 pb-24 pt-32 sm:px-6 lg:pb-32 lg:pt-40">
          <Reveal>
            <h2 className="display max-w-[760px] text-[38px] sm:text-[52px]">Everything you need. Nothing you don&apos;t.</h2>
            <p className="mt-5 max-w-[560px] text-[17px] leading-relaxed text-ink-2">
              No agents to install, no YAML. Paste a URL and the first check runs before the page reloads.
            </p>
          </Reveal>

          <div className="mt-14 grid gap-4 md:grid-cols-2">
            <Reveal>
              <FeatureCard title="Checks that don't cry wolf" body="Timeouts, status codes and keywords. A failed check is retried once before anyone gets paged.">
                <BarsVisual />
              </FeatureCard>
            </Reveal>
            <Reveal delay={0.06}>
              <FeatureCard title="Incidents that close themselves" body="One message in Slack or Discord when it breaks, one when it's back, with how long it took.">
                <PipelineVisual />
              </FeatureCard>
            </Reveal>
            <Reveal delay={0.03}>
              <FeatureCard title="SSL before it bites" body="Certificates are checked twice a day, so an expiring cert never takes you down by surprise.">
                <SslVisual />
              </FeatureCard>
            </Reveal>
            <Reveal delay={0.09}>
              <FeatureCard title="Built for teams" body="A workspace per client or project. Invite people by link as owner, admin, member or viewer.">
                <TeamVisual />
              </FeatureCard>
            </Reveal>
          </div>
        </section>

        {/* The one dark section: the page your customers see. */}
        <section className="bg-night text-white">
          <div className="mx-auto grid max-w-[1200px] items-center gap-14 px-4 py-24 sm:px-6 lg:grid-cols-[1fr_1fr] lg:py-32">
            <Reveal>
              <h2 className="display text-[38px] sm:text-[52px]">Your customers see the truth.</h2>
              <p className="mt-5 max-w-[460px] text-[17px] leading-relaxed text-white/70">
                One switch publishes a status page with 90 days of history and recent incidents. Fewer &ldquo;is it just me?&rdquo; tickets, more trust.
              </p>
              <Link
                href="/status/demo"
                className="mt-9 inline-flex h-12 items-center gap-2 rounded-[var(--radius-ctl)] bg-white px-6 text-[15.5px] font-medium text-[#111] transition-colors hover:bg-white/85"
              >
                See a live status page <ArrowUpRight className="size-4" aria-hidden />
              </Link>
            </Reveal>
            <Reveal delay={0.1}>
              <StatusPreview />
            </Reveal>
          </div>
        </section>

        {/* How it works, as plain numbered columns. */}
        <section className="mx-auto max-w-[1200px] px-4 py-24 sm:px-6 lg:py-32">
          <Reveal>
            <h2 className="display max-w-[900px] text-[38px] sm:text-[52px]">From URL to status page in a minute.</h2>
          </Reveal>
          <ol className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Add a monitor", "Name, URL and how often. Optional: the status code to expect and a word that must be on the page."],
              ["We keep watch", "Due monitors are checked in parallel every few minutes. Every result is kept for 90 days."],
              ["You hear first", "Two failures in a row open an incident and ping your channel. The next good check closes it."],
              ["Share the page", "Turn on the public status page. It shows uptime and incidents, never your URLs or settings."],
            ].map(([title, body], index) => (
              <Reveal key={title} delay={index * 0.06}>
                <li>
                  <span className="text-[44px] font-bold leading-none tracking-[-0.04em] text-line-strong">{index + 1}</span>
                  <h3 className="mt-4 text-[18px] font-semibold tracking-[-0.01em]">{title}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{body}</p>
                </li>
              </Reveal>
            ))}
          </ol>
        </section>

        {/* Engineering, for the technical reader. Kept quiet on purpose. */}
        <section className="border-t border-line">
          <div className="mx-auto grid max-w-[1200px] gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[0.8fr_1.2fr]">
            <Reveal>
              <h2 className="text-[26px] font-bold tracking-[-0.03em]">Small, careful engineering</h2>
              <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-[15px] font-medium text-pen hover:underline">
                Read the source on GitHub <ArrowUpRight className="size-4" aria-hidden />
              </a>
            </Reveal>
            <Reveal delay={0.06}>
              <ul className="grid gap-x-10 gap-y-5 text-[15px] leading-relaxed text-ink-2 sm:grid-cols-2">
                <li>
                  <strong className="font-semibold text-ink">Next.js 16 and TypeScript strict.</strong> Server Components and Server Actions, no client-side data fetching.
                </li>
                <li>
                  <strong className="font-semibold text-ink">Postgres with Drizzle.</strong> Uptime and charts are aggregated in SQL, not in the browser.
                </li>
                <li>
                  <strong className="font-semibold text-ink">Safe scheduler.</strong> Monitors are claimed with <code className="tabular text-[13px]">FOR UPDATE SKIP LOCKED</code>, so overlapping runs never double-check.
                </li>
                <li>
                  <strong className="font-semibold text-ink">SSRF protection.</strong> Private and cloud-metadata addresses are refused on every redirect hop.
                </li>
              </ul>
            </Reveal>
          </div>
        </section>

        {/* Final call to action */}
        <section className="bg-surface-2">
          <div className="mx-auto max-w-[1200px] px-4 py-24 text-center sm:px-6 lg:py-32">
            <Reveal>
              <h2 className="display mx-auto max-w-[760px] text-[38px] sm:text-[56px]">The next outage is coming. Hear about it first.</h2>
              <div className="mt-10">
                <PrimaryActions />
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-4 px-4 py-8 text-[13.5px] text-ink-3 sm:px-6">
          <Logo />
          <p>An open-source portfolio project by Nikita. Next.js, Postgres, Drizzle.</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ title, body, children }: { title: string; body: string; children: React.ReactNode }) {
  return (
    <article className="group flex h-full flex-col rounded-[18px] bg-surface-2 p-6 transition-colors hover:bg-surface-3/70 sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-[21px] font-bold tracking-[-0.02em]">{title}</h3>
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-ink text-paper transition-transform group-hover:translate-x-0.5" aria-hidden>
          <ArrowRight className="size-3.5" />
        </span>
      </div>
      <p className="mt-2 max-w-[440px] text-[15px] leading-relaxed text-ink-2">{body}</p>
      <div className="mt-auto pt-8">
        <div className="rounded-[12px] bg-surface p-5 shadow-card">{children}</div>
      </div>
    </article>
  );
}
