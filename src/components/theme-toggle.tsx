// src/components/theme-toggle.tsx
"use client";

import { useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { THEME_STORAGE_KEY, type ThemeChoice } from "@/lib/theme";
import { cx } from "@/lib/cx";

const CHANGE_EVENT = "sitewatch-theme-change";

function readChoice(): ThemeChoice {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return "system";
  }
}

function subscribe(callback: () => void) {
  // Our own event for this tab, "storage" to stay in sync with other open tabs.
  const onStorage = (event: StorageEvent) => {
    if (event.key === THEME_STORAGE_KEY) {
      applyChoice(readChoice());
      callback();
    }
  };
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", onStorage);
  };
}

function applyChoice(choice: ThemeChoice) {
  const root = document.documentElement;
  if (choice === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", choice);
}

function setChoice(choice: ThemeChoice) {
  try {
    if (choice === "system") localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, choice);
  } catch {
    // Storage blocked (private mode): the choice still applies until the page reloads.
  }
  applyChoice(choice);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

const options: Array<{ value: ThemeChoice; label: string; icon: typeof Sun }> = [
  { value: "light", label: "Light theme", icon: Sun },
  { value: "dark", label: "Dark theme", icon: Moon },
  { value: "system", label: "Use system theme", icon: Monitor },
];

/** Light / Dark / System switch. The server renders "system"; the saved choice takes over after hydration. */
export function ThemeToggle({ className }: { className?: string }) {
  const choice = useSyncExternalStore(subscribe, readChoice, () => "system" as ThemeChoice);

  return (
    <div role="radiogroup" aria-label="Color theme" className={cx("inline-flex items-center gap-0.5 rounded-full border border-line bg-surface-2 p-0.5", className)}>
      {options.map((option) => {
        const active = choice === option.value;
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={option.label}
            title={option.label}
            onClick={() => setChoice(option.value)}
            className={cx(
              "grid size-7 place-items-center rounded-full transition-colors",
              active ? "bg-surface text-ink shadow-card ring-1 ring-line" : "text-ink-3 hover:text-ink",
            )}
          >
            <Icon className="size-3.5" strokeWidth={2} aria-hidden />
          </button>
        );
      })}
    </div>
  );
}
