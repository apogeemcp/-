"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandMark } from "./BrandMark";
import { WalletButton } from "./WalletButton";

const links = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Desk" },
  { href: "/launches", label: "Launches" },
  { href: "/wallet", label: "Wallet" },
  { href: "/analytics", label: "Analytics" },
  { href: "/connect", label: "Connect" },
];

export function Nav() {
  const path = usePathname();
  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-3">
        <BrandMark />
        <div className="flex items-center gap-2">
          <nav className="flex max-w-[52vw] items-center gap-1 overflow-x-auto rounded-full border border-gold/20 bg-black/50 px-2 py-1 backdrop-blur-xl">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-full px-3 py-1.5 text-[11px] uppercase tracking-[0.16em] ${
                  path === l.href ? "bg-gold text-void" : "text-ivory/70 hover:text-ivory"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <Link
            href="/orbit"
            className="rounded-full border border-gold/40 px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] text-ivory"
          >
            Chat
          </Link>
          <WalletButton />
        </div>
      </div>
    </header>
  );
}
