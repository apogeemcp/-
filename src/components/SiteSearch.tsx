"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { searchSite, type SiteHit } from "@/lib/search";

const RECENTS_KEY = "apogee-search-recent";

function loadRecents(): string[] {
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.map(String).slice(0, 6) : [];
  } catch {
    return [];
  }
}

function saveRecent(q: string) {
  const next = [q, ...loadRecents().filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, 6);
  localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
}

export function SiteSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [recents, setRecents] = useState<string[]>([]);
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();
  const hits: SiteHit[] = q.trim().length ? searchSite(q) : recents.map((r) => ({ title: r, href: "", section: "Recent", text: r }));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    setRecents(loadRecents());
    setActive(0);
    const t = requestAnimationFrame(() => input.current?.focus());
    return () => cancelAnimationFrame(t);
  }, [open]);

  function go(hit: SiteHit) {
    const term = q.trim() || hit.title;
    if (term) saveRecent(term);
    setOpen(false);
    setQ("");
    if (hit.href) router.push(hit.href);
    else router.push(`/dashboard?scan=${encodeURIComponent(hit.title)}`);
  }

  function submit() {
    const trimmed = q.trim();
    if (!trimmed) return;
    if (hits[active]) {
      go(hits[active]);
      return;
    }
    saveRecent(trimmed);
    setOpen(false);
    router.push(`/dashboard?scan=${encodeURIComponent(trimmed)}`);
  }

  return (
    <div className="relative">
      <button
        type="button"
        className="chrome-pill max-[420px]:px-2"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        Search
      </button>
      {open ? (
        <div
          className="fixed inset-0 z-[70] flex items-start justify-center bg-black/70 p-4 pt-[12vh]"
          onClick={() => setOpen(false)}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Search Apogee"
            className="glass-3 w-full max-w-lg p-3"
            onClick={(e) => e.stopPropagation()}
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
            >
              <label htmlFor="site-search" className="sr-only">
                Search tokens, wallets, docs
              </label>
              <input
                id="site-search"
                ref={input}
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setActive(0);
                }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setActive((i) => Math.min(hits.length - 1, i + 1));
                  }
                  if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setActive((i) => Math.max(0, i - 1));
                  }
                }}
                placeholder="Token, wallet, Desk, MCP…"
                className="field w-full rounded-xl"
                autoComplete="off"
                aria-controls={listId}
                aria-expanded={hits.length > 0}
              />
            </form>
            <ul id={listId} role="listbox" className="mt-2 max-h-[min(50vh,20rem)] overflow-y-auto">
              {hits.length ? (
                hits.map((h, i) => (
                  <li key={`${h.section}-${h.title}-${h.href}`}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={i === active}
                      className={`flex w-full items-baseline justify-between gap-3 px-3 py-2 text-left text-sm ${i === active ? "bg-white/10 text-ivory" : "text-ivory/80 hover:bg-white/5"}`}
                      onClick={() => go(h)}
                    >
                      <span className="truncate">{h.title}</span>
                      <span className="shrink-0 text-[10px] uppercase tracking-[0.16em] text-ember">{h.section}</span>
                    </button>
                  </li>
                ))
              ) : (
                <li className="px-3 py-4 text-sm text-ivory/65">
                  {q.trim()
                    ? "No matches. Try a ticker, 0x address, or “developers”."
                    : "Search tokens, wallets, tools, and guides. Press Esc to close."}
                </li>
              )}
            </ul>
            <p className="mt-2 px-1 text-[10px] uppercase tracking-[0.16em] text-ivory/45">⌘K · Esc</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
