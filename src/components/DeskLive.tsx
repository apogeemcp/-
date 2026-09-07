"use client";

import { useEffect, useState } from "react";
import { LaunchGrid, type PonsLaunch } from "./LaunchPad";

type Desk = {
  chain?: { block?: number; tvlUsd?: number; stockTokens?: number };
  trending?: Array<{ name?: string; priceUsd?: number | null; change1h?: number | null; address?: string }>;
  launches?: PonsLaunch[];
  stocks?: Array<{
    symbol: string;
    mid: number | null;
    dexPrice: number | null;
    premiumBps: number | null;
  }>;
};

export function DeskLive() {
  const [desk, setDesk] = useState<Desk | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    fetch("/api/v1/get_desk")
      .then((r) => r.json())
      .then((j) => {
        if (!live) return;
        if (!j.ok) setError(j.error || "desk failed");
        else setDesk(j.result);
      })
      .catch((e) => live && setError(String(e)));
    return () => {
      live = false;
    };
  }, []);

  if (error) {
    return <p className="text-sm text-flare">Desk feed unavailable: {error}</p>;
  }
  if (!desk) {
    return <p className="animate-pulse text-sm text-ivory/50">Lighting the desk…</p>;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <article className="glass rounded-3xl p-5">
        <p className="text-[10px] uppercase tracking-[0.24em] text-gold">Chain</p>
        <p className="mt-3 font-display text-4xl text-ivory">{desk.chain?.block?.toLocaleString()}</p>
        <p className="text-xs uppercase tracking-[0.16em] text-ivory/50">latest block</p>
        <p className="mt-4 text-sm text-ivory/70">
          TVL ${Math.round(desk.chain?.tvlUsd || 0).toLocaleString()} · {desk.chain?.stockTokens} stock tokens
        </p>
      </article>
      <article className="glass rounded-3xl p-5">
        <p className="text-[10px] uppercase tracking-[0.24em] text-ember">Trending</p>
        <ul className="mt-3 space-y-2">
          {(desk.trending || []).slice(0, 6).map((t) => (
            <li key={String(t.address || t.name)} className="flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate text-ivory">{t.name}</span>
              <span className={Number(t.change1h) >= 0 ? "text-gold" : "text-flare"}>
                {t.change1h == null ? "—" : `${t.change1h.toFixed(1)}%`}
              </span>
            </li>
          ))}
        </ul>
      </article>
      <article className="glass rounded-3xl p-5">
        <p className="text-[10px] uppercase tracking-[0.24em] text-flare">Stock desk</p>
        <ul className="mt-3 space-y-2">
          {(desk.stocks || []).map((s) => (
            <li key={s.symbol} className="flex items-baseline justify-between gap-3 text-sm">
              <span className="text-ivory">{s.symbol}</span>
              <span className="font-mono text-ivory/80">{s.dexPrice ? `$${s.dexPrice.toFixed(2)}` : "—"}</span>
              <span className={Number(s.premiumBps) >= 0 ? "text-gold" : "text-flare"}>
                {s.premiumBps == null ? "" : `${(s.premiumBps / 100).toFixed(2)}%`}
              </span>
            </li>
          ))}
        </ul>
      </article>
      <article className="glass rounded-3xl p-5 lg:col-span-3">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-[0.24em] text-gold">pons launches</p>
          <a href="/launches" className="text-[11px] uppercase tracking-[0.16em] text-ivory/50 hover:text-gold">
            All launches
          </a>
        </div>
        <LaunchGrid launches={(desk.launches || []).slice(0, 6)} compact />
      </article>
    </div>
  );
}
