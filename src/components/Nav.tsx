"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BrandMark } from "./BrandMark";
import { InstallApp } from "./InstallApp";
import { SiteSearch } from "./SiteSearch";
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
      <div className="h-px bg-gradient-to-r from-transparent via-gold to-ember/80" />
      <div className="border-b border-gold/15 bg-[#06050a]/88 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-3 sm:gap-3 sm:px-6 pt-[env(safe-area-inset-top)]">
          <BrandMark size={36} />
          <div className="flex min-w-0 items-center gap-2">
            <Link
              href="/connect"
              className="hidden min-w-0 max-w-[36vw] truncate rounded-full border border-gold/25 bg-black/40 px-3 py-1.5 font-mono text-[11px] text-gold hover:border-gold/55 xl:inline"
              title={mcp}
            >
              {mcp.replace("https://", "")}
            </Link>
            <InstallApp compact />
            <SiteSearch />
            <Link href="/developers" className="chrome-pill hidden sm:inline">
              Developers
            </Link>
            <div className="relative" ref={menu}>
              <button
                type="button"
                aria-expanded={open}
                aria-haspopup="menu"
                onClick={() => setOpen((v) => !v)}
                className="chrome-pill"
                aria-label="More navigation links"
              >
                More
              </button>
              {open ? (
                <div
                  role="menu"
                  className="glass-3 absolute right-0 top-12 z-50 max-h-[min(70vh,28rem)] w-56 origin-top-right overflow-y-auto py-1"
                >
                  {MORE_LINKS.map((l) => (
                    <Link
                      key={l.href}
                      href={l.href}
                      role="menuitem"
                      onClick={() => setOpen(false)}
                      className="block px-3 py-2.5 text-sm tracking-wide text-ivory/75 transition hover:bg-gold/10 hover:text-gold-bright"
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
