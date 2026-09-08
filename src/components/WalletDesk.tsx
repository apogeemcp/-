"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CopyButton } from "./TokenMedia";
import { useWallet } from "./WalletProvider";
import { explorerAddress, explorerTx, shortAddress } from "@/lib/chain";

export function WalletDesk() {
  const { address, connect, connecting } = useWallet();
  const params = useSearchParams();
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
    const fromUrl = params.get("address");
    if (fromUrl) {
      setQuery(fromUrl);
      load(fromUrl);
      return;
    }
    if (address) {
      setQuery(address);
      load(address);
    }
  }, [address, params]);

  const positions = (data?.positions as Array<{ symbol?: string; formatted?: string; usd?: number | null; token?: string }> | undefined) || [];
  const recent = (data?.recent as Array<{ hash?: string; symbol?: string; kind?: string }> | undefined) || [];
  const shown = String(data?.address || query);

  return (
    <div className="space-y-6">
      <div className="panel rounded-xl p-6">
        <p className="kicker">Profile · wallet</p>
        <h2 className="mt-2 font-display text-3xl text-ivory">Holdings on Robinhood Chain</h2>
        <p className="mt-2 text-sm text-ivory/75">
          Phantom connect and pasted addresses share this view. Equity is mark-to-market from DexScreener — we do not invent cost-basis PnL.
        </p>
        <form
          className="mt-4 flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            if (query) load(query);
          }}
        >
          <label htmlFor="wallet-query" className="sr-only">
            Wallet address
          </label>
          <input
            id="wallet-query"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="0x wallet"
            className="field min-w-0 flex-1 font-mono"
          />
          <button type="submit" className="btn-ghost">
            Track
          </button>
          <button type="button" onClick={connect} className="btn-gold">
            {connecting ? "…" : address ? "Refresh Phantom" : "Connect Phantom"}
          </button>
        </form>
        {busy ? <p className="mt-4 text-sm text-ivory/70">Reading chain…</p> : null}
        {error ? <p className="mt-4 text-sm text-flare">{error}</p> : null}
      </div>
      {data && "ok" in data && data.ok !== false ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="panel rounded-xl p-5">
            <p className="kicker">Equity (mark)</p>
            <p className="mt-2 font-display text-3xl text-ivory">
              {typeof data.equityUsd === "number" ? `$${data.equityUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "—"}
            </p>
            <p className="mt-3 break-all font-mono text-xs text-ivory/80">{shown}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <CopyButton value={shown} label="Copy wallet" />
              <a className="btn-ghost text-xs" href={explorerAddress(shown)} target="_blank" rel="noreferrer">
                Explorer
              </a>
            </div>
            <p className="mt-3 font-mono text-xs text-ivory/75">
              ETH {typeof data.nativeUsd === "number" ? `$${data.nativeUsd.toFixed(2)}` : "—"} · tokens{" "}
              {typeof data.tokenUsd === "number" ? `$${data.tokenUsd.toFixed(2)}` : "—"}
            </p>
          </div>
          <div className="panel rounded-xl p-5 lg:col-span-2">
            <p className="kicker">Positions</p>
            <ul className="mt-3 space-y-2">
              {positions.length ? (
                positions.map((p) => (
                  <li key={p.token || p.symbol} className="flex justify-between gap-3 font-mono text-xs text-ivory">
                    {p.token ? (
                      <a className="text-gold hover:underline" href={`/token/${p.token}`}>
                        {p.symbol}
                      </a>
                    ) : (
                      <span>{p.symbol}</span>
                    )}
                    <span>
                      {p.formatted} {p.usd != null ? `· $${p.usd.toFixed(2)}` : ""}
                    </span>
                  </li>
                ))
              ) : (
                <li className="text-sm text-ivory/70">No watched Stock Tokens / USDG / WETH with a balance. Native ETH is in the equity card.</li>
              )}
            </ul>
          </div>
          <div className="panel rounded-xl p-5 lg:col-span-3">
            <p className="kicker">Recent flow</p>
            {recent.length ? (
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {recent.slice(0, 12).map((t, i) => (
                  <li key={t.hash || i} className="truncate font-mono text-[11px] text-ivory/75">
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
            ) : (
              <p className="mt-3 text-sm text-ivory/70">
                {typeof data.note === "string" ? data.note : "No explorer transfers in this window. Blockscout is often Cloudflare-gated; RPC balances still load."}
              </p>
            )}
          </div>
        </div>
      ) : !busy && !error ? (
        <p className="text-sm text-ivory/70">Connect Phantom or paste a 0x address to load a profile.</p>
      ) : null}
    </div>
  );
}
