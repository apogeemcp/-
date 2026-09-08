"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useWallet } from "./WalletProvider";
import { useRole } from "./RoleProvider";

export function HubChrome() {
  const pathname = usePathname();
  const { address, verified } = useWallet();
  const { role } = useRole();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!verified) return;
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((j) => setCount(Array.isArray(j.items) ? j.items.filter((i: { read?: boolean }) => !i.read).length : 0))
      .catch(() => {});
  }, [verified, pathname]);

  if (!pathname.startsWith("/developers")) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-[11px] uppercase tracking-[0.14em] text-ivory/70">
      <span className="text-emerald-300">MCP public</span>
      <span className="text-ivory/30">·</span>
      <span>{role || "no role"}</span>
      {address ? (
        <>
          <span className="text-ivory/30">·</span>
          <span className="font-mono normal-case tracking-normal text-ivory/80">
            {address.slice(0, 6)}…{address.slice(-4)} {verified ? "✓" : ""}
          </span>
        </>
      ) : null}
      <span className="ml-auto flex gap-2 normal-case tracking-normal">
        <Link href="/developers/profile" className="text-ember hover:text-ivory">
          Profile
        </Link>
        <Link href="/developers/support" className="text-ember hover:text-ivory">
          Support{count ? ` (${count})` : ""}
        </Link>
      </span>
    </div>
  );
}
