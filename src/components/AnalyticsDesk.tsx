"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PriceChart } from "./PriceChart";

export function AnalyticsDesk() {
  const [query, setQuery] = useState("NVDA");
  const [busy, setBusy] = useState(false);
  const [overview, setOverview] = useState<Record<string, unknown> | null>(null);
  const [analytics, setAnalytics] = useState<Record<string, unknown> | null>(null);
  const [smart, setSmart] = useState<Record<string, unknown> | null>(null);
  const [holders, setHolders] = useState<Record<string, unknown> | null>(null);
  const [activity, setActivity] = useState<Record<string, unknown> | null>(null);
  const [chart, setChart] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function run(e?: React.FormEvent) {
    e?.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const [ov, a, s, c] = await Promise.all([
        fetch("/api/v1/get_market_overview").then((r) => r.json()),
        fetch(`/api/v1/get_token_analytics?query=${encodeURIComponent(query)}`).then((r) => r.json()),
        fetch(`/api/v1/get_smart_money?query=${encodeURIComponent(query)}`).then((r) => r.json()),
        fetch(`/api/v1/get_chart?query=${encodeURIComponent(query)}&timeframe=minute&aggregate=15`).then((r) => r.json()),
      ]);
      setOverview(ov.result || ov);
      const ar = a.result || a;
      const tokenAddr = ar?.token?.address || (query.startsWith("0x") ? query : "");
      setAnalytics(ar);
      setSmart(s.result || s);
      setChart(c.result || c);
      if (tokenAddr) {
        const [h, act] = await Promise.all([
          fetch(`/api/v1/get_holders?address=${encodeURIComponent(tokenAddr)}`).then((r) => r.json()),
          fetch(`/api/v1/get_token_activity?query=${encodeURIComponent(tokenAddr)}`).then((r) => r.json()),
        ]);
        setHolders(h.result || h);
        setActivity(act.result || act);
      } else {
        setHolders(null);
        setActivity(null);
      }
      if (ar?.ok === false) setError(String(ar.error || "No market"));
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }

  const addr = String((analytics as { token?: { address?: string } } | null)?.token?.address || "");
  const tx = analytics?.txns as { buys?: number; sells?: number } | undefined;
  const smartRows = (smart?.smart as Array<{ address: string; buys: number; volume: number }> | undefined) || [];
  const top = (holders?.top as Array<{ address: string; pct: number }> | undefined) || [];

  return (
    <div className="space-y-6">
      <div className="panel rounded-xl p-6">
        <p className="kicker">Analytics center</p>
        <h2 className="mt-2 font-heading text-3xl text-ivory">Market, flow, holders</h2>
        <p className="mt-2 text-sm text-ivory/75">
          TVL {typeof overview?.tvlUsd === "number" ? `$${Math.round(overview.tvlUsd).toLocaleString()}` : "—"} · gas{" "}
          {typeof overview?.gas === "number" ? `${overview.gas.toFixed(4)} gwei` : "—"}
        </p>
        <form className="mt-4 flex flex-col gap-2 sm:flex-row" onSubmit={run}>
          <input value={query} onChange={(e) => setQuery(e.target.value)} className="field flex-1" placeholder="NVDA, ticker, or 0x…" />
          <button className="btn-gold" disabled={busy}>
            {busy ? "Running" : "Run"}
          </button>
        </form>
        {error ? <p className="mt-3 text-sm text-flare">{error}</p> : null}
        {addr ? (
          <Link href={`/token/${addr}`} className="mt-3 inline-block text-sm text-gold">
            Open token terminal →
          </Link>
        ) : null}
      </div>
      {analytics && analytics.ok !== false ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Price", analytics.priceUsd != null ? `$${analytics.priceUsd}` : "—"],
            ["Volume", analytics.volume != null ? `$${Number(analytics.volume).toLocaleString()}` : "—"],
            ["Liquidity", analytics.liquidityUsd != null ? `$${Number(analytics.liquidityUsd).toLocaleString()}` : "—"],
            ["Buy / sell", `${tx?.buys ?? analytics.buys ?? "—"} / ${tx?.sells ?? analytics.sells ?? "—"}`],
            ["Change", analytics.changePct != null ? `${Number(analytics.changePct).toFixed(2)}%` : "—"],
            ["FDV", analytics.fdv != null ? `$${Number(analytics.fdv).toLocaleString()}` : "—"],
            ["Ratio", analytics.buySellRatio != null ? Number(analytics.buySellRatio).toFixed(2) : "—"],
            ["DEX", String(analytics.dex || "—")],
          ].map(([k, v]) => (
            <div key={k} className="panel rounded-xl p-4">
              <p className="kicker">{k}</p>
              <p className="mt-2 font-mono text-sm text-ivory">{v}</p>
            </div>
          ))}
        </div>
      ) : null}
      {chart?.bars ? (
        <div className="panel rounded-xl p-5">
          <p className="kicker">15m candles</p>
          <PriceChart bars={chart.bars as Array<{ open?: number; high?: number; low?: number; close?: number }>} />
        </div>
      ) : null}
      {top.length ? (
        <div className="panel rounded-xl p-5">
          <p className="kicker">Holder concentration (recent-flow proxy)</p>
          <ul className="mt-3 space-y-1 font-mono text-xs text-ivory/85">
            {top.slice(0, 10).map((h) => (
              <li key={h.address} className="flex justify-between gap-3">
                <Link className="truncate hover:text-gold" href={`/wallet?address=${h.address}`}>
                  {h.address}
                </Link>
                <span>{h.pct.toFixed(2)}%</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-ivory/65">{String(holders?.note || "")}</p>
        </div>
      ) : null}
      {activity?.ok ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="panel rounded-xl p-5">
            <p className="kicker">Recent trades</p>
            <ul className="mt-3 space-y-1 font-mono text-xs text-ivory/85">
              {(((activity.trades as Array<{ side?: string; usd?: number; hash?: string; explorer?: string }>) || []).slice(0, 10)).map((tx, i) => (
                <li key={tx.hash || i}>
                  <span className={tx.side === "buy" ? "text-gold" : "text-flare"}>{tx.side === "buy" ? "BUY" : "SELL"}</span>{" "}
                  {tx.usd != null ? `$${Number(tx.usd).toFixed(2)}` : ""}
                </li>
              ))}
            </ul>
            {!((activity.trades as unknown[]) || []).length ? <p className="mt-2 text-sm text-ivory/70">{String(activity.note || "No trades")}</p> : null}
          </div>
          <div className="panel rounded-xl p-5">
            <p className="kicker">Burns in sample</p>
            <p className="mt-2 font-mono text-sm text-ivory">
              {activity.burnedAmount != null ? Number(activity.burnedAmount).toPrecision(6) : "—"} · burned USD {String(activity.burnedUsd ?? "—")}
            </p>
            <p className="mt-2 text-xs text-ivory/70">{String(activity.note || "")}</p>
          </div>
        </div>
      ) : null}
      {smartRows.length ? (
        <div className="panel rounded-xl p-5">
          <p className="kicker">Repeat-buy wallets</p>
          <ul className="mt-3 space-y-1 font-mono text-[11px] text-ivory/80">
            {smartRows.slice(0, 12).map((w) => (
              <li key={w.address}>
                <Link href={`/wallet?address=${w.address}`} className="hover:text-gold">
                  {w.address}
                </Link>{" "}
                · {w.buys} buys · vol {w.volume.toPrecision(4)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
