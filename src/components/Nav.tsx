"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Orbit" },
  { href: "/dashboard", label: "Desk" },
  { href: "/docs", label: "Tools" },
  { href: "/usage", label: "Usage" },
];

export function Nav() {
  const path = usePathname();
  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <Link href="/" className="flex items-baseline gap-3">
          <span className="font-display text-lg tracking-[0.28em] text-ivory">APOGEE</span>
          <span className="hidden text-[10px] uppercase tracking-[0.24em] text-gold/80 sm:inline">RH Chain</span>
        </Link>
        <nav className="flex items-center gap-1 rounded-full border border-gold/20 bg-black/40 px-2 py-1 backdrop-blur">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-full px-3 py-1.5 text-xs uppercase tracking-[0.18em] ${
                path === l.href ? "bg-gold text-void" : "text-ivory/70 hover:text-ivory"
              }`}
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/dashboard"
            className="rounded-full bg-gradient-to-r from-gold via-ember to-flare px-3 py-1.5 text-xs font-medium uppercase tracking-[0.16em] text-void"
          >
            Add MCP
          </Link>
        </nav>
      </div>
    </header>
  );
}
