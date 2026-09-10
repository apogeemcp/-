"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CANONICAL_MCP, COMMUNITY, PRODUCT } from "@/lib/site";
import { CHAIN } from "@/lib/chain";

const KEY = "apogee-welcome-saturn-v1";

export function WelcomeGate() {
  const [show, setShow] = useState(false);
  const enter = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    try {
      setShow(localStorage.getItem(KEY) !== "1");
    } catch {
      setShow(false);
    }
  }, []);

  useEffect(() => {
    if (!show) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = requestAnimationFrame(() => enter.current?.focus());
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
      cancelAnimationFrame(t);
    };
  }, [show]);

  function dismiss() {
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* ignore quota */
    }
    setShow(false);
  }

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-title"
      onClick={dismiss}
    >
      <div
        className="welcome-overlay relative max-h-[min(92vh,52rem)] w-full max-w-2xl overflow-y-auto rounded-3xl border border-gold/35 bg-[#08060a]/95 p-6 shadow-gold sm:p-10"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="pointer-events-none absolute left-1/2 top-[-30%] h-72 w-72 -translate-x-1/2">
          <span className="saturn-orbit inset-0 opacity-70" />
        </span>
        <p className="relative kicker">First transmission</p>
        <h2 id="welcome-title" className="relative mt-3 font-display text-4xl tracking-[0.12em] text-ivory sm:text-5xl">
          Welcome to Apogee
        </h2>
        <p className="relative mt-2 font-script text-2xl text-gold-bright">Saturn over Robinhood Chain</p>
        <p className="lede relative mt-5 text-lg leading-relaxed text-ivory/85">
          You just walked into a live intel desk for agents — {PRODUCT.toolCount} operations, chain {CHAIN.id}, MCP with
          auth none. No custody. No invented numbers. Keys never leave your wallet.
        </p>

        <ul className="relative mt-7 grid gap-3 sm:grid-cols-3">
          {[
            { k: "Apogee", v: "The product, the site, the MCP. Search, chart, desk, launch, track." },
            { k: "Orbit", v: "In-app AI on /orbit. It calls the same live tools a Cursor agent would." },
            { k: "Seals", v: "Fifty Saturn cards. Memo + image + burn. After 50, the set is closed." },
          ].map((row) => (
            <li key={row.k} className="rounded-2xl border border-gold/20 bg-black/35 p-4">
              <p className="font-display tracking-[0.18em] text-gold">{row.k}</p>
              <p className="mt-2 text-xs leading-relaxed text-ivory/75">{row.v}</p>
            </li>
          ))}
        </ul>

        <p className="relative mt-6 text-[12px] leading-relaxed text-ivory/60">
          There is no secret founder roster on this page. The team is the public surface: Desk, Orbit, MCP, and the
          service wallet that writes notes and seals. Community lives on Telegram, X, and GitHub.
        </p>

        <div className="relative mt-5 flex flex-wrap gap-3 text-[12px] uppercase tracking-[0.16em]">
          <a href={COMMUNITY.telegram} className="text-gold hover:text-gold-bright" target="_blank" rel="noreferrer">
            Telegram
          </a>
          <a href={COMMUNITY.x} className="text-gold hover:text-gold-bright" target="_blank" rel="noreferrer">
            X
          </a>
          <a href={COMMUNITY.github} className="text-gold hover:text-gold-bright" target="_blank" rel="noreferrer">
            GitHub
          </a>
          <Link href="/about" className="text-gold hover:text-gold-bright" onClick={dismiss}>
            About
          </Link>
          <Link href="/onchain-seals" className="text-gold hover:text-gold-bright" onClick={dismiss}>
            Seal cards
          </Link>
        </div>
        <p className="relative mt-4 font-mono text-[11px] text-gold/80">{CANONICAL_MCP}</p>

        <div className="relative mt-8 flex flex-wrap gap-3">
          <button ref={enter} type="button" className="btn-primary" onClick={dismiss}>
            Enter the ring
          </button>
          <Link href="/connect" className="btn-ghost" onClick={dismiss}>
            Add MCP
          </Link>
          <Link href="/orbit" className="btn-ghost" onClick={dismiss}>
            Open Orbit
          </Link>
        </div>
      </div>
    </div>
  );
}
