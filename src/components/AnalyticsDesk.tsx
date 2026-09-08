"use client";

import { useEffect, useState } from "react";

export function AnalyticsDesk() {
  const [query, setQuery] = useState("NVDA");
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [overview, setOverview] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    fetch("/api/v1/get_market_overview")
      .then((r) => r.json())
      .then((j) => setOverview(j.result || j))
      .catch(() => null);
  }, []);

  async function run(e?: React.FormEvent) {
    e?.preventDefault();
    const [a, s] = await Promise.all([
      fetch(`/api/v1/get_token_analytics?query=${encodeURIComponent(query)}`).then((r) => r.json()),
      fetch(`/api/v1/get_smart_money?query=${encodeURIComponent(query)}`).then((r) => r.json()),
    ]);
    setData({ analytics: a.result || a, smart: s.result || s });
  }

  const analytics = data?.analytics as { priceUsd?: number; volume?: number; liquidityUsd?: number; changePct?: number } | undefined;
  const smart = data?.smart as { smart?: Array<{ address: string; buys: number; volume: number }> } | undefined;

  return (
    <div className="space-y-6">
      <div className="panel rounded-xl p-6">
        <p className="kicker">Analytics</p>
        <h2 className="mt-2 font-display text-3xl">Flow, volume, smart money</h2>
        <p className="mt-2 text-sm text-ivory/60">
          TVL {typeof overview?.tvlUsd === "number" ? `$${Math.round(overview.tvlUsd).toLocaleString()}` : "—"} · gas{" "}
          {typeof overview?.gas === "number" ? `${overview.gas.toFixed(4)} gwei` : "—"}
        </p>
        <form className="mt-4 flex gap-2" onSubmit={run}>
          <input value={query} onChange={(e) => setQuery(e.target.value)} className="field flex-1" />
          <button className="btn-gold">Run</button>
        </form>
      </div>
      {analytics ? (
        <div className="grid gap-3 sm:grid-cols-4">
          {[
            ["Price", analytics.priceUsd != null ? `$${analytics.priceUsd}` : "—"],
            ["Volume", analytics.volume != null ? `$${Number(analytics.volume).toLocaleString()}` : "—"],
            ["Liquidity", analytics.liquidityUsd != null ? `$${Number(analytics.liquidityUsd).toLocaleString()}` : "—"],
            ["Change", analytics.changePct != null ? `${analytics.changePct}%` : "—"],
          ].map(([k, v]) => (
            <div key={k} className="panel rounded-xl p-4">
              <p className="kicker">{k}</p>
              <p className="mt-2 font-mono text-sm text-ivory">{v}</p>
            </div>
          ))}
        </div>
      ) : null}
      {smart?.smart?.length ? (
        <div className="panel rounded-xl p-5">
          <p className="kicker">Repeat-buy wallets</p>
          <ul className="mt-3 space-y-1 font-mono text-[11px] text-ivory/70">
            {smart.smart.slice(0, 12).map((w) => (
              <li key={w.address}>
                {w.address} · {w.buys} buys · vol {w.volume.toPrecision(4)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
