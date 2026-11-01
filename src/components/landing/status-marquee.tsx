// src/components/landing/status-marquee.tsx
const items = [
  ["acme.com", "118 ms", "up"],
  ["api.acme.com/health", "203 ms", "up"],
  ["shop.acme.com", "341 ms", "up"],
  ["billing.acme.com", "503", "down"],
  ["docs.acme.com", "2.3 s", "degraded"],
  ["cdn.acme.com", "42 ms", "up"],
  ["auth.acme.com", "156 ms", "up"],
  ["status.acme.com", "88 ms", "up"],
] as const;

const tone = { up: "bg-up", down: "bg-down", degraded: "bg-degraded" };

export function StatusMarquee() {
  const row = (hidden: boolean) => (
    <ul className="flex shrink-0 items-center gap-10 pr-10" aria-hidden={hidden}>
      {items.map(([host, value, status]) => (
        <li key={host} className="flex items-center gap-2.5 whitespace-nowrap font-mono text-[12.5px]">
          <span className={`size-1.5 rounded-full ${tone[status]}`} />
          <span className="text-ink-2">{host}</span>
          <span className={status === "down" ? "text-down" : status === "degraded" ? "text-degraded" : "text-ink-3"}>{value}</span>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="group relative flex overflow-hidden border-y border-line bg-surface py-3.5 [mask-image:linear-gradient(90deg,transparent,black_8%,black_92%,transparent)]">
      <div className="flex w-max animate-[marquee_38s_linear_infinite] group-hover:[animation-play-state:paused] motion-reduce:animate-none">
        {row(false)}
        {row(true)}
      </div>
      <style>{`@keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
    </div>
  );
}
