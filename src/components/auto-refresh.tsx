// src/components/auto-refresh.tsx
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/** Re-fetches server data on an interval while the tab is visible, so the dashboard stays live without websockets. */
export function AutoRefresh({ seconds = 60 }: { seconds?: number }) {
  const router = useRouter();
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    const tick = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      setRemaining((value) => {
        if (value <= 1) {
          router.refresh();
          return seconds;
        }
        return value - 1;
      });
    }, 1000);
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        router.refresh();
        setRemaining(seconds);
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(tick);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router, seconds]);

  return (
    <span className="inline-flex items-center gap-1.5 tabular text-[11.5px] text-ink-3" aria-live="off">
      <span className="relative inline-block size-1.5 rounded-full bg-up text-up status-ping" aria-hidden />
      live · {remaining}s
    </span>
  );
}
