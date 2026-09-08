"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BrandMark } from "./BrandMark";
import { TabBar } from "./TabBar";
import { WalletButton } from "./WalletButton";
import { MORE_LINKS, TABS, mcpHttpUrl } from "@/lib/site";

export function Nav() {
  const [open, setOpen] = useState(false);
  const menu = useRef<HTMLDivElement>(null);
  const mcp = mcpHttpUrl();

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (menu.current && !menu.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-50">
      <div className="border-b border-white/[0.06] bg-[#080706]/92 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <BrandMark size={32} />
          <div className="flex min-w-0 items-center gap-2">
            <Link
              href="/connect"
              className="hidden min-w-0 max-w-[46vw] truncate rounded-md border border-white/10 bg-black/40 px-2.5 py-1 font-mono text-[11px] text-gold/90 hover:border-gold/40 lg:inline"
              title={mcp}
            >
              {mcp.replace("https://", "")}
            </Link>
            <div className="relative" ref={menu}>
              <button
                type="button"
                aria-expanded={open}
                aria-haspopup="menu"
                onClick={() => setOpen((v) => !v)}
                className="rounded-md border border-white/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.16em] text-ivory/70 hover:text-ivory"
              >
                More
              </button>
              {open ? (
                <div
                  role="menu"
                  className="absolute right-0 top-9 z-50 w-48 overflow-hidden rounded-xl border border-white/10 bg-[#0c0b0a] py-1 shadow-2xl"
                >
                  {MORE_LINKS.map((l) => (
                    <Link
                      key={l.href}
                      href={l.href}
                      role="menuitem"
                      onClick={() => setOpen(false)}
                      className="block px-3 py-2 text-sm text-ivory/75 hover:bg-white/5 hover:text-ivory"
                    >
                      {l.label}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
            <WalletButton />
          </div>
        </div>
      </div>
      <TabBar tabs={TABS} />
    </header>
  );
}
