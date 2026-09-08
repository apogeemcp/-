"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const KEY = "apogee-onboard-v1";

const STEPS = [
  { href: "/about", label: "What Apogee is", body: "Robinhood Chain intel for agents — not a custodian." },
  { href: "/dashboard", label: "Desk", body: "Scan tickers, trending pools, and Stock Token premiums." },
  { href: "/orbit", label: "Orbit", body: "Ask in plain language. Orbit calls live MCP tools." },
  { href: "/launches", label: "Launch", body: "On-chain pons index. Unsigned txs sign in Phantom." },
  { href: "/wallet", label: "Wallet", body: "Connect Phantom on Robinhood Chain, or paste a 0x to analyze." },
  { href: "/developers", label: "MCP", body: "Auth none. Add https://apogeemcp.digital/api/mcp to Cursor or Claude." },
] as const;

export function FirstVisit() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      setShow(localStorage.getItem(KEY) !== "1");
    } catch {
      setShow(false);
    }
  }, []);

  if (!show) return null;

  function dismiss() {
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* ignore quota */
    }
    setShow(false);
  }

  return (
    <aside className="panel rounded-xl p-5" aria-label="First visit">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="kicker">Start here</p>
          <h2 className="mt-1 font-heading text-xl text-ivory">First session</h2>
          <p className="mt-1 text-sm text-ivory/75">Skip anytime. This does not create an account.</p>
        </div>
        <button type="button" className="btn-ghost text-xs" onClick={dismiss}>
          Skip
        </button>
      </div>
      <ol className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {STEPS.map((s, i) => (
          <li key={s.href}>
            <Link
              href={s.href}
              onClick={dismiss}
              className="block rounded-xl border border-white/10 bg-black/30 p-3 hover:border-ember/40"
            >
              <p className="font-mono text-[10px] text-ivory/50">0{i + 1}</p>
              <p className="mt-1 text-sm text-ivory">{s.label}</p>
              <p className="mt-1 text-xs leading-relaxed text-ivory/70">{s.body}</p>
            </Link>
          </li>
        ))}
      </ol>
    </aside>
  );
}
