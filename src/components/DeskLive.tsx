"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LaunchGrid, type PonsLaunch } from "./LaunchPad";

type Trend = {
  name?: string;
  symbol?: string;
  address?: string;
  tokenAddress?: string | null;
  poolAddress?: string | null;
  priceUsd?: number | null;
  change1h?: number | null;
  change24h?: number | null;
  volume24h?: number | null;
  reserveUsd?: number | null;
};

type Desk = {
  chain?: { block?: number; tvlUsd?: number; stockTokens?: number };
  trending?: Trend[];
  launches?: PonsLaunch[];
  geckoLaunches?: Trend[];
  stocks?: Array<{
    symbol: string;
    address?: string | null;
    mid: number | null;
    dexPrice: number | null;
    premiumBps: number | null;
    volume24h?: number | null;
    liquidity?: number | null;
  }>;
  boosted?: unknown[];
};

function usd(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return "—";
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  return `$${Math.round(n).toLocaleString()}`;
}

function tokenHref(t: Trend) {
  const addr = t.tokenAddress || (t.address && /^0x[a-fA-F0-9]{40}$/.test(t.address) ? t.address : "");
  if (addr) return `/token/${addr}`;
  return `/dashboard?scan=${encodeURIComponent(t.symbol || t.name || "")}`;
}

export function DeskLive() {
  const [desk, setDesk] = useState<Desk | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updated, setUpdated] = useState<number | null>(null);

  useEffect(() => {
    let live = true;
    const load = () => {
      fetch("/api/v1/get_desk")
        .then((r) => r.json())
        .then((j) => {
          if (!live) return;
          if (!j.ok) setError(j.error || "desk failed");
          else {
            setDesk(j.result);
            setError(null);
            setUpdated(Date.now());
          }
        })
        .catch((e) => live && setError(String(e)));
    };
    load();
    const id = setInterval(load, 45_000);
    return () => {
      live = false;
      clearInterval(id);
    };
  }, []);

  if (error && !desk) return <p className="text-sm text-flare">Desk feed unavailable: {error}</p>;
  if (!desk) return <p className="animate-pulse text-sm text-ivory/70">Lighting the desk…</p>;

  const trend = desk.trending || [];
  const ranked = [...trend].sort((a, b) => Number(b.change1h || 0) - Number(a.change1h || 0));
  const gainers = ranked.filter((t) => Number(t.change1h) > 0).slice(0, 6);
  const losers = [...ranked].reverse().filter((t) => Number(t.change1h) < 0).slice(0, 6);
  const vol = trend.reduce((s, t) => s + (Number(t.volume24h) || 0), 0);
  const fresh = desk.geckoLaunches || [];

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <article className="panel rounded-xl p-5">
        <p className="kicker">Market</p>
        <p className="mt-3 font-display text-4xl text-ivory">{desk.chain?.block?.toLocaleString()}</p>
        <p className="text-xs uppercase tracking-[0.16em] text-ivory/70">latest block</p>
        <p className="mt-4 font-mono text-sm text-ivory">
          TVL {usd(desk.chain?.tvlUsd)} · {desk.chain?.stockTokens} stock tokens
        </p>
        <p className="mt-2 font-mono text-sm text-ivory">Trending sample vol {usd(vol)}</p>
        <p className="mt-2 text-xs text-ivory/70">
          {desk.boosted?.length || 0} boosted listings
          {updated ? ` · refreshed ${new Date(updated).toLocaleTimeString()}` : ""}
        </p>
      </article>
      <article className="panel rounded-xl p-5">
        <p className="kicker text-ember">Gainers (1h)</p>
        <ul className="mt-3 space-y-2">
          {gainers.length ? (
            gainers.map((t) => (
              <li key={String(t.tokenAddress || t.poolAddress || t.name)} className="flex items-baseline justify-between gap-3 text-sm">
                <Link className="truncate text-ivory hover:text-gold" href={tokenHref(t)}>
                  {t.symbol || t.name}
                </Link>
                <span className="font-mono text-gold">{Number(t.change1h).toFixed(1)}%</span>
              </li>
            ))
          ) : (
            <li className="text-sm text-ivory/70">No positive 1h prints in this trending sample.</li>
          )}
        </ul>
      </article>
      <article className="panel rounded-xl p-5">
        <p className="kicker text-flare">Losers (1h)</p>
        <ul className="mt-3 space-y-2">
          {losers.length ? (
            losers.map((t) => (
              <li key={String(t.tokenAddress || t.poolAddress || t.name)} className="flex items-baseline justify-between gap-3 text-sm">
                <Link className="truncate text-ivory hover:text-gold" href={tokenHref(t)}>
                  {t.symbol || t.name}
                </Link>
                <span className="font-mono text-flare">{Number(t.change1h).toFixed(1)}%</span>
              </li>
            ))
          ) : (
            <li className="text-sm text-ivory/70">No negative 1h prints in this trending sample.</li>
          )}
        </ul>
      </article>
      <article className="panel rounded-xl p-5">
        <p className="kicker">Trending</p>
        <ul className="mt-3 space-y-2">
          {trend.slice(0, 8).map((t) => (
            <li key={String(t.tokenAddress || t.poolAddress || t.name)} className="flex items-baseline justify-between gap-3 text-sm">
              <Link className="truncate text-ivory hover:text-gold" href={tokenHref(t)}>
                {t.symbol || t.name}
              </Link>
              <span className="font-mono text-ivory/80">{usd(t.volume24h ?? null)}</span>
            </li>
          ))}
        </ul>
      </article>
      <article className="panel rounded-xl p-5 lg:col-span-2">
        <p className="kicker text-flare">Stock desk</p>
        <ul className="mt-3 space-y-2">
          {(desk.stocks || []).map((s) => (
            <li key={s.symbol} className="grid grid-cols-[4rem_1fr_auto] items-baseline gap-3 text-sm">
              {s.address ? (
                <Link href={`/token/${s.address}`} className="text-ivory hover:text-gold">
                  {s.symbol}
                </Link>
              ) : (
                <span className="text-ivory">{s.symbol}</span>
              )}
              <span className="font-mono text-ivory">{s.dexPrice ? `$${s.dexPrice.toFixed(2)}` : "—"}</span>
              <span className={Number(s.premiumBps) >= 0 ? "font-mono text-gold" : "font-mono text-flare"}>
                {s.premiumBps == null ? "" : `${(s.premiumBps / 100).toFixed(2)}%`}
              </span>
            </li>
          ))}
        </ul>
      </article>
      {fresh.length ? (
        <article className="panel rounded-xl p-5 lg:col-span-3">
          <p className="kicker">New Gecko pools</p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {fresh.slice(0, 9).map((t) => (
              <li key={String(t.tokenAddress || t.poolAddress || t.name)}>
                <Link className="flex items-baseline justify-between gap-3 text-sm text-ivory hover:text-gold" href={tokenHref(t)}>
                  <span className="truncate">{t.symbol || t.name}</span>
                  <span className="font-mono text-ivory/80">{usd(t.reserveUsd ?? t.volume24h ?? null)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </article>
      ) : null}
      <article className="panel rounded-xl p-5 lg:col-span-3">
        <div className="mb-4 flex items-center justify-between">
          <p className="kicker">pons launches</p>
          <Link href="/launches" className="text-[11px] uppercase tracking-[0.16em] text-ivory/70 hover:text-gold">
            All launches
          </Link>
        </div>
        <LaunchGrid launches={(desk.launches || []).slice(0, 6)} compact />
      </article>
    </div>
  );
}
