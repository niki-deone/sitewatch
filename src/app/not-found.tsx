// src/app/not-found.tsx
import { Logo } from "@/components/logo";
import { ButtonLink } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="graph-paper grid min-h-dvh place-items-center px-4">
      <div className="max-w-md text-center">
        <Logo className="justify-center" />
        <p className="mt-10 tabular text-[64px] font-semibold leading-none tracking-tight text-down">404</p>
        <h1 className="mt-3 text-[22px] font-semibold tracking-tight">Nothing is being monitored here</h1>
        <p className="mt-2 text-[14.5px] text-ink-2">The page doesn&apos;t exist, or you don&apos;t have access to it.</p>
        <div className="mt-7 flex justify-center gap-2">
          <ButtonLink href="/app">Open dashboard</ButtonLink>
          <ButtonLink href="/" variant="secondary">
            Home
          </ButtonLink>
        </div>
      </div>
    </main>
  );
}
