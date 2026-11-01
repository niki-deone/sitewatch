// src/components/landing/status-preview.tsx
// A small, static version of the public status page, shown inside the dark section of the landing page.
type Tone = "up" | "degraded" | "down";

function strip(failDays: number[], slowDays: number[] = []): Tone[] {
  return Array.from({ length: 45 }, (_, day) => (failDays.includes(day) ? "down" : slowDays.includes(day) ? "degraded" : "up"));
}

const services = [
  { name: "Website", uptime: "99.99%", days: strip([]) },
  { name: "API", uptime: "99.95%", days: strip([17], [31]) },
  { name: "Checkout", uptime: "99.97%", days: strip([], [8, 9]) },
];

const toneBg: Record<Tone, string> = { up: "bg-up", degraded: "bg-degraded", down: "bg-down" };

export function StatusPreview() {
  return (
    <div className="rounded-[16px] bg-surface p-5 text-ink shadow-window sm:p-7">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[17px] font-bold tracking-[-0.02em]">Acme status</p>
        <p className="text-[11.5px] text-ink-3">updated every minute</p>
      </div>
      <div className="mt-4 rounded-[10px] bg-up px-4 py-3 text-[14.5px] font-semibold text-white">All systems operational</div>
      <ul className="mt-5 grid gap-5">
        {services.map((service) => (
          <li key={service.name}>
            <div className="mb-2 flex items-center justify-between text-[13px]">
              <span className="font-semibold">{service.name}</span>
              <span className="font-mono text-[11.5px] text-ink-3">{service.uptime}</span>
            </div>
            <div className="flex h-7 items-end gap-[2px]" aria-hidden>
              {service.days.map((tone, index) => (
                <span key={index} className={`h-full flex-1 rounded-[2px] ${toneBg[tone]}`} />
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
