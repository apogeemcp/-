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
      <path d="M12 3c4 3.2 6.2 7.4 6.2 11.2A6.2 6.2 0 0 1 12 20.4 6.2 6.2 0 0 1 5.8 14.2C5.8 10.4 8 6.2 12 3Z" />
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
  return `h-5 w-5 ${active ? "text-gold" : "text-ivory/50"}`;
}

export function TabBar({ tabs }: { tabs: readonly { href: string; label: string; hint?: string }[] }) {
  const path = usePathname();
  const active = (href: string) => (href === "/" ? path === "/" : path === href || path.startsWith(`${href}/`));

  return (
    <>
      <nav className="hidden border-b border-white/[0.06] bg-[#080706]/92 backdrop-blur-xl md:block" aria-label="Primary">
        <div className="mx-auto grid max-w-6xl grid-cols-5 px-2">
          {tabs.map((t) => {
            const on = active(t.href);
            return (
              <Link
                key={t.href}
                href={t.href}
                aria-current={on ? "page" : undefined}
                className={`relative flex h-12 items-center justify-center gap-2 text-[13px] tracking-[0.04em] transition ${
                  on ? "text-ivory" : "text-ivory/45 hover:text-ivory/80"
                }`}
              >
                {ICONS[t.href]?.(on)}
                <span className="font-medium">{t.label}</span>
                {on ? <span className="absolute inset-x-8 bottom-0 h-[2px] bg-gold shadow-gold" /> : null}
              </Link>
            );
          })}
        </div>
      </nav>

      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#080706]/96 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
        aria-label="Primary"
      >
        <div className="grid grid-cols-5">
          {tabs.map((t) => {
            const on = active(t.href);
            return (
              <Link
                key={t.href}
                href={t.href}
                aria-current={on ? "page" : undefined}
                className="flex min-h-11 flex-col items-center justify-center gap-0.5 py-2"
              >
                {ICONS[t.href]?.(on)}
                <span className={`text-[10px] tracking-[0.12em] ${on ? "text-gold" : "text-ivory/65"}`}>{t.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
