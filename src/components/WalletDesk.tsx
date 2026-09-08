"use client";

import { useEffect, useState } from "react";
import { useWallet } from "./WalletProvider";
import { explorerAddress, explorerTx } from "@/lib/chain";

export function WalletDesk() {
  const { address, connect, connecting } = useWallet();
  const [query, setQuery] = useState("");
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load(addr: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/track_wallet?address=${encodeURIComponent(addr)}`);
      const json = await res.json();
      if (json.ok === false) setError(json.error || json.result?.error || "track failed");
      else setData(json.result || json);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (address) {
      setQuery(address);
      load(address);
    }
  }, [address]);

  const positions = (data?.positions as Array<{ symbol?: string; formatted?: string; usd?: number | null }> | undefined) || [];
  const recent = (data?.recent as Array<{ hash?: string; symbol?: string; kind?: string }> | undefined) || [];

  return (
    <div className="space-y-6">
      <div className="panel rounded-xl p-6">
        <p className="kicker">Wallet tracker</p>
        <h2 className="mt-2 font-display text-3xl">Robinhood Chain holdings</h2>
        <form
          className="mt-4 flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (query) load(query);
          }}
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="0x wallet"
            className="field min-w-[16rem] flex-1 font-mono"
          />
          <button type="submit" className="btn-ghost">
            Track
          </button>
          <button type="button" onClick={connect} className="btn-gold">
            {connecting ? "…" : address ? "Refresh Phantom" : "Connect Phantom"}
          </button>
        </form>
        {busy ? <p className="mt-4 text-sm text-ivory/50">Reading chain…</p> : null}
        {error ? <p className="mt-4 text-sm text-flare">{error}</p> : null}
      </div>
      {data && "ok" in data && data.ok !== false ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="panel rounded-xl p-5">
            <p className="kicker">Equity (mark)</p>
            <p className="mt-2 font-display text-3xl text-ivory">
              {typeof data.equityUsd === "number" ? `$${data.equityUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "—"}
            </p>
            <a className="mt-2 inline-block font-mono text-[11px] text-ivory/50" href={explorerAddress(String(data.address || query))} target="_blank" rel="noreferrer">
              explorer ↗
            </a>
          </div>
          <div className="panel rounded-xl p-5 lg:col-span-2">
            <p className="kicker">Positions</p>
            <ul className="mt-3 space-y-2">
              {positions.length ? (
                positions.map((p) => (
                  <li key={p.symbol} className="flex justify-between font-mono text-xs text-ivory/80">
                    <span>{p.symbol}</span>
                    <span>
                      {p.formatted} {p.usd != null ? `· $${p.usd.toFixed(2)}` : ""}
                    </span>
                  </li>
                ))
              ) : (
                <li className="text-sm text-ivory/40">No watched tokens with balance.</li>
              )}
            </ul>
          </div>
          <div className="panel rounded-xl p-5 lg:col-span-3">
            <p className="kicker">Recent flow</p>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {recent.slice(0, 12).map((t, i) => (
                <li key={t.hash || i} className="truncate font-mono text-[11px] text-ivory/60">
                  {t.hash ? (
                    <a href={explorerTx(t.hash)} target="_blank" rel="noreferrer" className="hover:text-gold">
                      {t.kind} {t.symbol} {t.hash.slice(0, 10)}…
                    </a>
                  ) : (
                    `${t.kind} ${t.symbol}`
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}
