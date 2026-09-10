"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ICONS: Record<string, (active: boolean) => ReactNode> = {
  "/": (a) => (
    <svg viewBox="0 0 24 24" className={ico(a)} fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M4 11.5 12 4l8 7.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-8.5Z" />
    </svg>
  ),
  "/dashboard": (a) => (
    <svg viewBox="0 0 24 24" className={ico(a)} fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="3" y="4" width="7" height="7" rx="1.2" />
      <rect x="14" y="4" width="7" height="4" rx="1.2" />
      <rect x="14" y="11" width="7" height="9" rx="1.2" />
      <rect x="3" y="14" width="7" height="6" rx="1.2" />
    </svg>
  ),
  "/launches": (a) => (
    <svg viewBox="0 0 24 24" className={ico(a)} fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M12 3c4 3.2 6.2 7.4 6.2 11.2A6.2 6.2 0 1 1 12 20.4 6.2 6.2 0 0 1 5.8 14.2C5.8 10.4 8 6.2 12 3Z" />
      <path d="M12 14.2V8.4" />
    </svg>
  ),
  "/orbit": (a) => (
    <svg viewBox="0 0 24 24" className={ico(a)} fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M5 18.5 6.8 13A7 7 0 1 1 19 12c0 3.4-2.4 6.2-6.2 6.2H8.2L5 18.5Z" />
    </svg>
  ),
  "/wallet": (a) => (
    <svg viewBox="0 0 24 24" className={ico(a)} fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M3 10h18" />
      <circle cx="16.5" cy="14.2" r="1" fill="currentColor" />
    </svg>
  ),
};

function ico(active: boolean) {
  return `h-5 w-5 ${active ? "text-gold-bright" : "text-ivory/45"}`;
}

export function TabBar({ tabs }: { tabs: readonly { href: string; label: string; hint?: string }[] }) {
  const path = usePathname();
  const active = (href: string) => (href === "/" ? path === "/" : path === href || path.startsWith(`${href}/`));
  const index = Math.max(
    0,
    tabs.findIndex((t) => active(t.href)),
  );

  return (
    <>
      <nav className="hidden border-b border-gold/10 bg-[#06050a]/92 backdrop-blur-2xl md:block" aria-label="Primary">
        <div className="relative mx-auto grid max-w-6xl grid-cols-5 px-2">
          <span className="tab-indicator" style={{ transform: `translateX(${index * 100}%)` }} />
          {tabs.map((t) => {
            const on = active(t.href);
            return (
              <Link
                key={t.href}
                href={t.href}
                aria-current={on ? "page" : undefined}
                className={`relative flex min-h-12 items-center justify-center gap-2 text-[12px] uppercase tracking-[0.18em] transition ${
                  on ? "text-gold-bright" : "text-ivory/40 hover:text-ivory/80"
                }`}
              >
                {ICONS[t.href]?.(on)}
                <span className="font-medium">{t.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-gold/15 bg-[#06050a]/96 pb-[env(safe-area-inset-bottom)] backdrop-blur-2xl md:hidden"
        aria-label="Primary"
      >
        <div className="grid grid-cols-5 px-1">
          {tabs.map((t) => {
            const on = active(t.href);
            return (
              <Link
                key={t.href}
                href={t.href}
                aria-current={on ? "page" : undefined}
                className="flex min-h-12 flex-col items-center justify-center gap-0.5 py-2"
              >
                <span className={`rounded-full px-3 py-1 transition ${on ? "bg-gold/15 tab-glow" : ""}`}>
                  {ICONS[t.href]?.(on)}
                </span>
                <span className={`text-[9px] uppercase tracking-[0.16em] ${on ? "text-gold-bright" : "text-ivory/55"}`}>
                  {t.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
