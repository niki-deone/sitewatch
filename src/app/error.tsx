// src/app/error.tsx
"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="graph-paper grid min-h-[70dvh] flex-1 place-items-center px-4">
      <div className="max-w-md text-center">
        <p className="font-mono text-[13px] uppercase tracking-[0.18em] text-down">Incident detected</p>
        <h1 className="mt-3 text-[24px] font-semibold tracking-tight">Something broke on our side</h1>
        <p className="mt-2 text-[14.5px] text-ink-2">
          The error was logged{error.digest ? <> with reference <span className="font-mono">{error.digest}</span></> : null}. Try again in a moment.
        </p>
        <Button className="mt-6" onClick={reset}>
          Try again
        </Button>
      </div>
    </main>
  );
}
