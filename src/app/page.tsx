// src/app/page.tsx
import Link from "next/link";
import { ArrowRight, BellRing, Globe, KeyRound, Radar, ShieldCheck, Users } from "lucide-react";
import { demoEnabled } from "@/auth";
import { signInAsDemo } from "@/lib/actions/auth";
import { Logo } from "@/components/logo";
import { Button, ButtonLink } from "@/components/ui";
import { HeroInstrument } from "@/components/landing/hero-instrument";
import { StatusMarquee } from "@/components/landing/status-marquee";
import { Reveal } from "@/components/landing/reveal";
import { BarsVisual, PipelineVisual, SslVisual, TeamVisual } from "@/components/landing/feature-visuals";

const GITHUB_URL = "https://github.com/niki-deone/sitewatch";

function DemoButton({ size = "lg", variant = "primary" }: { size?: "md" | "lg"; variant?: "primary" | "secondary" }) {
  if (!demoEnabled) {
    return (
      <ButtonLink href="/login" size={size} variant={variant}>
        Get started <ArrowRight className="size-4" aria-hidden />
      </ButtonLink>
    );
  }
  return (
    <form action={signInAsDemo}>
      <Button type="submit" size={size} variant={variant}>
        Explore the live demo <ArrowRight className="size-4" aria-hidden />
      </Button>
    </form>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-line/70 bg-paper/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-4 px-4 sm:px-6">
          <Logo />
          <nav aria-label="Main" className="hidden items-center gap-7 text-[14px] text-ink-2 md:flex">
            <a href="#features" className="hover:text-ink">
              Features
            </a>
            <a href="#how" className="hover:text-ink">
              How it works
            </a>
            <Link href="/status/demo" className="hover:text-ink">
              Status page
            </Link>
            <a href={GITHUB_URL} className="hover:text-ink" target="_blank" rel="noreferrer">
              GitHub
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <ButtonLink href="/login" variant="ghost" size="sm" className="hidden sm:inline-flex">
              Sign in
            </ButtonLink>
            <ButtonLink href="/login" size="sm">
              Start monitoring
            </ButtonLink>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="graph-paper relative overflow-hidden">
          <div className="mx-auto grid max-w-[1200px] items-center gap-14 px-4 pb-24 pt-16 sm:px-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:pb-32 lg:pt-24">
            <div>
              <Reveal>
                <p className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 font-mono text-[12px] text-ink-2 shadow-card">
                  <span className="relative inline-block size-1.5 rounded-full bg-up text-up status-ping" aria-hidden />
                  Uptime monitoring for small teams
                </p>
              </Reveal>
              <Reveal delay={0.08}>
                <h1 className="mt-6 text-[42px] font-semibold leading-[1.02] tracking-[-0.035em] sm:text-[56px] lg:text-[64px]">
                  Know it&apos;s down
                  <br />
                  <span className="relative inline-block">
                    before they do.
                    <svg className="absolute -bottom-2 left-0 h-3 w-full" viewBox="0 0 300 12" preserveAspectRatio="none" aria-hidden>
                      <path d="M2 8 L70 8 L82 2 L96 11 L108 8 L298 8" fill="none" stroke="var(--down)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="draw-in" style={{ ["--dash" as string]: 320, animationDelay: "0.6s" }} />
                    </svg>
                  </span>
                </h1>
              </Reveal>
              <Reveal delay={0.16}>
                <p className="mt-7 max-w-[520px] text-[17px] leading-relaxed text-ink-2">
                  SiteWatch checks your websites and APIs every few minutes, opens an incident the moment one breaks, pings your team in Slack or Discord and keeps a public status page up to date.
                </p>
              </Reveal>
              <Reveal delay={0.24}>
                <div className="mt-9 flex flex-wrap items-center gap-3">
                  <DemoButton />
                  <ButtonLink href="/login" size="lg" variant="secondary">
                    Sign in with GitHub
                  </ButtonLink>
                </div>
                <p className="mt-4 text-[13px] text-ink-3">The demo is a real, read-only workspace. No sign-up needed.</p>
              </Reveal>
            </div>

            <div className="lg:pl-4">
              <HeroInstrument />
            </div>
          </div>
        </section>

        <StatusMarquee />

        {/* Features */}
        <section id="features" className="mx-auto max-w-[1200px] scroll-mt-20 px-4 py-24 sm:px-6 lg:py-32">
          <Reveal>
            <p className="font-mono text-[12px] uppercase tracking-[0.2em] text-pen">What you get</p>
            <h2 className="mt-3 max-w-2xl text-[34px] font-semibold leading-tight tracking-[-0.025em] sm:text-[42px]">
              Everything a small team needs to stop finding outages on Twitter.
            </h2>
          </Reveal>

          <div className="mt-14 grid gap-4 md:grid-cols-6">
            <Reveal className="md:col-span-4">
              <FeatureCard icon={<Radar className="size-5" />} title="Checks that don't cry wolf" body="HTTP checks every 5 to 60 minutes with timeouts, status code and keyword assertions. A failed check is retried once before anyone gets paged.">
                <BarsVisual />
              </FeatureCard>
            </Reveal>
            <Reveal className="md:col-span-2" delay={0.08}>
              <FeatureCard icon={<ShieldCheck className="size-5" />} title="SSL expiry warnings" body="Certificates are inspected twice a day, so an expiring cert never takes you down by surprise.">
                <SslVisual />
              </FeatureCard>
            </Reveal>
            <Reveal className="md:col-span-3" delay={0.04}>
              <FeatureCard icon={<BellRing className="size-5" />} title="Incidents and alerts" body="Incidents open and close on their own. Slack or Discord gets one message when it breaks and one when it's back, with the duration.">
                <PipelineVisual />
              </FeatureCard>
            </Reveal>
            <Reveal className="md:col-span-3" delay={0.12}>
              <FeatureCard icon={<Users className="size-5" />} title="Built for teams" body="Separate workspaces per client or project. Invite people by link as owner, admin, member or read-only viewer.">
                <TeamVisual />
                <div className="mt-5 flex items-center gap-2 rounded-lg border border-dashed border-line-strong px-3 py-2.5 font-mono text-[12px] text-ink-3">
                  <KeyRound className="size-3.5" aria-hidden /> /invite/x7Kp…Qm · one use · 7 days
                </div>
              </FeatureCard>
            </Reveal>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="scroll-mt-20 border-y border-line bg-surface">
          <div className="mx-auto grid max-w-[1200px] gap-12 px-4 py-24 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:py-28">
            <Reveal>
              <p className="font-mono text-[12px] uppercase tracking-[0.2em] text-pen">How it works</p>
              <h2 className="mt-3 text-[32px] font-semibold leading-tight tracking-[-0.025em] sm:text-[38px]">From URL to status page in about a minute.</h2>
              <p className="mt-4 text-[15.5px] leading-relaxed text-ink-2">
                No agents, no YAML. Paste a URL, pick an interval, and the first check runs before the page reloads.
              </p>
            </Reveal>
            <ol className="grid gap-4">
              {[
                ["01", "Add a monitor", "Name, URL, interval. Optional: expected status code, a keyword that must appear, a slow-response threshold."],
                ["02", "SiteWatch keeps watch", "A scheduler claims due monitors in batches, runs the checks in parallel and stores every result for 90 days."],
                ["03", "You hear about it first", "Two failures in a row open an incident and send your webhook. The next passing check resolves it automatically."],
                ["04", "Customers see the truth", "Turn on the public status page and share the link. It shows uptime bars and incidents, never your URLs or settings."],
              ].map(([number, title, body], index) => (
                <Reveal key={number} delay={index * 0.07}>
                  <li className="grid grid-cols-[auto_1fr] gap-5 rounded-[var(--radius-card)] border border-line bg-paper p-5">
                    <span className="font-mono text-[13px] font-semibold text-pen">{number}</span>
                    <div>
                      <h3 className="text-[16px] font-semibold">{title}</h3>
                      <p className="mt-1 text-[14px] leading-relaxed text-ink-2">{body}</p>
                    </div>
                  </li>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>

        {/* Status page + engineering */}
        <section className="mx-auto grid max-w-[1200px] gap-6 px-4 py-24 sm:px-6 lg:grid-cols-2 lg:py-32">
          <Reveal>
            <div className="h-full rounded-[18px] border border-line bg-surface p-7 shadow-card sm:p-9">
              <Globe className="size-6 text-pen" aria-hidden />
              <h2 className="mt-5 text-[26px] font-semibold tracking-tight">A status page your customers can trust</h2>
              <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
                One toggle publishes it. 90 days of history per service, recent incidents, refreshed every minute. Fewer &ldquo;is it just me?&rdquo; support tickets.
              </p>
              <ButtonLink href="/status/demo" variant="secondary" className="mt-7">
                See the demo status page <ArrowRight className="size-4" aria-hidden />
              </ButtonLink>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="h-full rounded-[18px] border border-ink bg-ink p-7 text-paper shadow-pop sm:p-9">
              <p className="font-mono text-[12px] uppercase tracking-[0.2em] opacity-60">Under the hood</p>
              <h2 className="mt-4 text-[26px] font-semibold tracking-tight">Small, boring, careful engineering</h2>
              <ul className="mt-5 grid gap-3 text-[14.5px] leading-relaxed opacity-90">
                <li>Next.js 16 App Router, Server Actions and TypeScript strict mode</li>
                <li>Postgres with Drizzle ORM, aggregations done in SQL</li>
                <li>Concurrency-safe scheduler using <span className="font-mono text-[13px]">FOR UPDATE SKIP LOCKED</span></li>
                <li>SSRF protection: private and cloud metadata addresses are refused on every redirect hop</li>
                <li>Tenant isolation enforced in one data access layer, roles checked on every action</li>
              </ul>
              <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="mt-7 inline-flex items-center gap-2 text-[14px] font-medium underline-offset-4 hover:underline">
                Read the source on GitHub <ArrowRight className="size-4" aria-hidden />
              </a>
            </div>
          </Reveal>
        </section>

        {/* Final CTA */}
        <section className="graph-paper border-t border-line">
          <div className="mx-auto max-w-[1200px] px-4 py-24 text-center sm:px-6">
            <Reveal>
              <h2 className="mx-auto max-w-2xl text-[34px] font-semibold leading-tight tracking-[-0.025em] sm:text-[44px]">The next outage is already scheduled. Be the first to know.</h2>
              <div className="mt-9 flex flex-wrap justify-center gap-3">
                <ButtonLink href="/login" size="lg">
                  Start monitoring free
                </ButtonLink>
                <DemoButton variant="secondary" />
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-4 px-4 py-8 text-[13px] text-ink-3 sm:px-6">
          <Logo />
          <p>An open-source portfolio project by Nikita. Built with Next.js, Postgres and Drizzle.</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, body, children }: { icon: React.ReactNode; title: string; body: string; children?: React.ReactNode }) {
  return (
    <article className="group flex h-full flex-col rounded-[18px] border border-line bg-surface p-6 shadow-card transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-pop sm:p-7">
      <span className="grid size-10 place-items-center rounded-[10px] bg-pen-soft text-pen" aria-hidden>
        {icon}
      </span>
      <h3 className="mt-5 text-[19px] font-semibold tracking-tight">{title}</h3>
      <p className="mt-2 text-[14.5px] leading-relaxed text-ink-2">{body}</p>
      {children ? <div className="mt-auto pt-7">{children}</div> : null}
    </article>
  );
}
