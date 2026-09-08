"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { HubChrome } from "./HubChrome";
import { DOCS_GROUPS, DOCS_NAV, DISCLAIMER, docsSearchIndex } from "@/lib/docs";

export function DocsSearch() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const hits = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (s.length < 2) return [];
    return docsSearchIndex()
      .filter((h) => `${h.title} ${h.section} ${h.text}`.toLowerCase().includes(s))
      .slice(0, 12);
  }, [q]);

  return (
    <div className="relative">
      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 180)}
        placeholder="Search docs, tools, legal…"
        className="field w-full rounded-xl"
        aria-label="Search developer documentation"
      />
      {open && hits.length ? (
        <ul className="glass-3 absolute z-30 mt-1 max-h-80 w-full overflow-auto py-1">
          {hits.map((h) => (
            <li key={`${h.href}-${h.title}`}>
              <Link
                href={h.href}
                className="block px-3 py-2 text-sm text-ivory/80 hover:bg-white/5 hover:text-ivory"
                onMouseDown={(e) => e.preventDefault()}
              >
                <span className="font-medium text-ivory">{h.title}</span>
                <span className="ml-2 text-[10px] uppercase tracking-[0.16em] text-ember">{h.section}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function DocsShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const current = DOCS_NAV.find((i) => i.href === pathname)?.href || "/developers";

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <div className="mb-4 md:hidden">
        <label className="kicker">Developers</label>
        <select
          className="field mt-2 w-full rounded-xl"
          value={current}
          onChange={(e) => router.push(e.target.value)}
          aria-label="Documentation menu"
        >
          {DOCS_NAV.map((i) => (
            <option key={i.href} value={i.href}>
              {i.group} · {i.label}
            </option>
          ))}
        </select>
        <div className="mt-3">
          <DocsSearch />
        </div>
      </div>
      <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="hidden md:block">
          <div className="sticky top-32 space-y-5">
            <DocsSearch />
            {DOCS_GROUPS.map((g) => (
              <div key={g}>
                <p className="kicker">{g}</p>
                <ul className="mt-2 space-y-1">
                  {DOCS_NAV.filter((i) => i.group === g).map((i) => {
                    const active = pathname === i.href;
                    return (
                      <li key={i.href}>
                        <Link
                          href={i.href}
                          className={`block rounded-lg px-2 py-1.5 text-sm ${
                            active ? "bg-white/8 text-ivory" : "text-ivory/70 hover:text-ivory"
                          }`}
                        >
                          {i.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
            <div>
              <p className="kicker">More</p>
              <ul className="mt-2 space-y-1 text-sm text-ivory/70">
                <li>
                  <Link href="/whitepaper" className="block rounded-lg px-2 py-1.5 hover:text-ivory">
                    Whitepaper
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="block rounded-lg px-2 py-1.5 hover:text-ivory">
                    Terms
                  </Link>
                </li>
                <li>
                  <Link href="/developer-terms" className="block rounded-lg px-2 py-1.5 hover:text-ivory">
                    Developer terms
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="block rounded-lg px-2 py-1.5 hover:text-ivory">
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link href="/data-usage" className="block rounded-lg px-2 py-1.5 hover:text-ivory">
                    Data usage
                  </Link>
                </li>
                <li>
                  <Link href="/connect" className="block rounded-lg px-2 py-1.5 hover:text-ivory">
                    Connect
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </aside>
        <div className="min-w-0 space-y-6">
          <HubChrome />
          {children}
          <p className="text-[11px] leading-relaxed text-ivory/55">{DISCLAIMER}</p>
        </div>
      </div>
    </div>
  );
}
