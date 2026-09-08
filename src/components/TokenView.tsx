"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CopyButton, TokenMedia } from "./TokenMedia";
import { PriceChart } from "./PriceChart";
import { useWallet } from "./WalletProvider";
import { CHAIN, explorerAddress, explorerToken, shortAddress } from "@/lib/chain";

type AnyRec = Record<string, unknown>;

async function tool(name: string, args: Record<string, string>) {
  const qs = new URLSearchParams(args).toString();
  const res = await fetch(`/api/v1/${name}?${qs}`);
  const json = await res.json();
  return (json.result || json) as AnyRec;
}

function usd(n: unknown) {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return "—";
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (Math.abs(v) >= 1_000) return `$${Math.round(v).toLocaleString()}`;
  if (Math.abs(v) < 0.01 && v !== 0) return `$${v.toExponential(2)}`;
  return `$${v.toLocaleString(undefined, { maximumFractionDigits: 6 })}`;
}

export function TokenView({ address }: { address: string }) {
  const { address: wallet } = useWallet();
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<AnyRec | null>(null);
  const [analytics, setAnalytics] = useState<AnyRec | null>(null);
  const [holders, setHolders] = useState<AnyRec | null>(null);
  const [activity, setActivity] = useState<AnyRec | null>(null);
  const [pons, setPons] = useState<AnyRec | null>(null);
  const [chart, setChart] = useState<AnyRec | null>(null);
  const [tf, setTf] = useState<{ timeframe: string; aggregate: number; label: string }>({
    timeframe: "minute",
    aggregate: 5,
    label: "5m",
  });
  const [pnl, setPnl] = useState<AnyRec | null>(null);

  useEffect(() => {
    let live = true;
    setBusy(true);
    setError(null);
    Promise.all([
      tool("get_token", { address }),
      tool("get_token_analytics", { query: address }),
      tool("get_holders", { address }),
      tool("get_token_activity", { query: address }),
      tool("get_pons_token", { address }),
    ])
      .then(([t, a, h, act, p]) => {
        if (!live) return;
        if (t.ok === false && !t.token) setError(String(t.error || "Token not found"));
        setToken(t);
        setAnalytics(a);
        setHolders(h);
        setActivity(act);
        setPons(p && p.ok !== false ? p : null);
      })
      .catch((e) => live && setError(String(e)))
      .finally(() => live && setBusy(false));
    return () => {
      live = false;
    };
  }, [address]);

  useEffect(() => {
    let live = true;
    tool("get_chart", { query: address, timeframe: tf.timeframe, aggregate: String(tf.aggregate) })
      .then((c) => live && setChart(c))
      .catch(() => null);
    return () => {
      live = false;
    };
  }, [address, tf]);

  useEffect(() => {
    if (!wallet) return;
    tool("get_wallet_pnl", { address: wallet })
      .then(setPnl)
      .catch(() => null);
  }, [wallet]);

  const t = (token?.token || token || {}) as AnyRec;
  const socials = (t.socials || {}) as { website?: string | null; x?: string | null; telegram?: string | null };
  const meta = (pons?.meta || {}) as AnyRec;
  const image = String(t.image || meta.logo || socials && (t as AnyRec).image || "") || null;
  const ca = String(t.address || address);
  const bars = (chart?.bars as Array<Record<string, number>>) || [];
  const trades = ((activity?.trades || activity?.transfers || []) as Array<AnyRec>).slice(0, 24);
  const burns = ((activity?.burns || []) as Array<AnyRec>).slice(0, 16);
  const topHolders = ((holders?.top || []) as Array<AnyRec>).slice(0, 12);
  const position = useMemo(() => {
    const rows = (pnl?.positions as Array<AnyRec> | undefined) || [];
    return rows.find((p) => String(p.token || "").toLowerCase() === ca.toLowerCase()) || null;
  }, [pnl, ca]);

  if (busy) return <p className="text-sm text-ivory/70">Loading token terminal…</p>;
  if (error) return <p className="text-sm text-flare">{error}</p>;

  const frames = [
    { label: "1m", timeframe: "minute", aggregate: 1 },
    { label: "5m", timeframe: "minute", aggregate: 5 },
    { label: "15m", timeframe: "minute", aggregate: 15 },
    { label: "1h", timeframe: "hour", aggregate: 1 },
    { label: "4h", timeframe: "hour", aggregate: 4 },
    { label: "1D", timeframe: "day", aggregate: 1 },
  ];

  return (
    <div className="space-y-6">
      <section className="panel rounded-xl p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <TokenMedia src={image} symbol={String(t.symbol || "")} name={String(t.name || "")} size={52} />
            <div className="min-w-0">
              <h2 className="font-heading text-2xl text-ivory sm:text-3xl">
                {String(t.name || meta.name || "Token")}{" "}
                <span className="font-mono text-base text-gold">{String(t.symbol || meta.symbol || "")}</span>
              </h2>
              <p className="mt-1 text-sm text-ivory/70">
                {CHAIN.name} · {t.canonicalStock ? "canonical Stock Token" : pons ? `pons ${pons.generation || ""}` : "market token"}
              </p>
              <p className="mt-2 break-all font-mono text-xs text-ivory/80">{ca}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <CopyButton value={ca} />
                <a className="btn-ghost text-xs" href={explorerToken(ca)} target="_blank" rel="noreferrer">
                  Explorer
                </a>
                {socials.website ? (
                  <a className="btn-ghost text-xs" href={String(socials.website)} target="_blank" rel="noreferrer">
                    Website
                  </a>
                ) : null}
                {socials.x ? (
                  <a className="btn-ghost text-xs" href={String(socials.x)} target="_blank" rel="noreferrer">
                    X
                  </a>
                ) : null}
                {socials.telegram ? (
                  <a className="btn-ghost text-xs" href={String(socials.telegram)} target="_blank" rel="noreferrer">
                    Telegram
                  </a>
                ) : null}
              </div>
            </div>
          </div>
          <dl className="grid min-w-[12rem] grid-cols-2 gap-3 sm:text-right">
            <div>
              <dt className="kicker">Price</dt>
              <dd className="font-mono text-lg text-ivory">{usd(t.priceUsd ?? analytics?.priceUsd)}</dd>
            </div>
            <div>
              <dt className="kicker">Mcap</dt>
              <dd className="font-mono text-lg text-ivory">{usd(t.mcap ?? t.marketCap ?? t.fdv)}</dd>
            </div>
          </dl>
        </div>
        {meta.description ? <p className="mt-4 text-sm leading-relaxed text-ivory/75">{String(meta.description)}</p> : null}
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Liquidity", usd(t.liquidity ?? analytics?.liquidityUsd)],
          ["Volume", usd(t.volume24h ?? analytics?.volume)],
          ["Buys / sells", `${analytics?.buys ?? "—"} / ${analytics?.sells ?? "—"}`],
          ["Change", analytics?.changePct != null ? `${analytics.changePct}%` : "—"],
        ].map(([k, v]) => (
          <div key={k} className="panel rounded-xl p-4">
            <p className="kicker">{k}</p>
            <p className="mt-2 font-mono text-sm text-ivory">{v}</p>
          </div>
        ))}
      </section>

      <section className="panel rounded-xl p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-heading text-xl text-ivory">Chart</h3>
          <div className="flex flex-wrap gap-1">
            {frames.map((f) => (
              <button
                key={f.label}
                type="button"
                onClick={() => setTf(f)}
                className={`rounded-md px-2 py-1 text-xs ${tf.label === f.label ? "bg-gold text-void" : "border border-white/15 text-ivory/80"}`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        {chart?.ok === false ? (
          <p className="text-sm text-ivory/70">{String(chart.error)}</p>
        ) : (
          <PriceChart bars={bars} />
        )}
      </section>

      {position ? (
        <section className="panel rounded-xl p-5">
          <h3 className="font-heading text-xl text-ivory">Your position</h3>
          <p className="mt-2 font-mono text-sm text-ivory">
            {String(position.formatted)} {String(position.symbol || t.symbol || "")} · mark {usd(position.usd)}
          </p>
          <p className="mt-2 text-xs text-ivory/65">
            Mark-to-market only. Cost basis is not recovered when explorer history is truncated — no fabricated PnL.
          </p>
        </section>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="panel rounded-xl p-5">
          <h3 className="font-heading text-xl text-ivory">Holders (proxy)</h3>
          <p className="mt-1 text-xs text-ivory/65">
            {holders?.holderCountProxy != null ? `${holders.holderCountProxy} wallets in recent flow` : "No holder sample"}
            {holders?.concentrationTop10 != null ? ` · top 10 ${Number(holders.concentrationTop10).toFixed(1)}% of sample` : ""}
          </p>
          <ul className="mt-3 space-y-2">
            {topHolders.length ? (
              topHolders.map((h) => (
                <li key={String(h.address)} className="flex items-baseline justify-between gap-3 font-mono text-xs text-ivory/85">
                  <Link className="truncate hover:text-gold" href={`/wallet?address=${h.address}`}>
                    {shortAddress(String(h.address))}
                  </Link>
                  <span>{Number(h.pct).toFixed(2)}%</span>
                </li>
              ))
            ) : (
              <li className="text-sm text-ivory/65">{String(holders?.note || "No holder proxy yet.")}</li>
            )}
          </ul>
        </div>
        <div className="panel rounded-xl p-5">
          <h3 className="font-heading text-xl text-ivory">Creator / fees</h3>
          {pons ? (
            <dl className="mt-3 space-y-2 text-sm text-ivory/80">
              <div className="flex justify-between gap-3">
                <dt>Generation</dt>
                <dd className="font-mono">{String(pons.generation || "—")}</dd>
              </div>
              {pons.deployer || meta.tokenDeployer ? (
                <div className="flex justify-between gap-3">
                  <dt>Creator</dt>
                  <dd>
                    <a className="font-mono text-gold" href={explorerAddress(String(pons.deployer || meta.tokenDeployer))} target="_blank" rel="noreferrer">
                      {shortAddress(String(pons.deployer || meta.tokenDeployer))}
                    </a>
                  </dd>
                </div>
              ) : null}
              {pons.fees ? (
                <div>
                  <dt>Fee split</dt>
                  <dd className="mt-1 font-mono text-xs">{JSON.stringify(pons.fees)}</dd>
                </div>
              ) : (
                <p className="text-xs text-ivory/65">Fee totals are not fully indexed on-chain in this window. Split policy is shown when the locker returns it.</p>
              )}
            </dl>
          ) : (
            <p className="mt-3 text-sm text-ivory/65">No pons factory record for this contract. Creator/fee fields stay empty rather than guessed.</p>
          )}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="panel rounded-xl p-5">
          <h3 className="font-heading text-xl text-ivory">Live buys / sells</h3>
          <ul className="mt-3 space-y-2">
            {trades.length ? (
              trades.map((tx, i) => (
                <li key={String(tx.hash || i)} className="flex items-baseline justify-between gap-3 text-xs">
                  <span className={tx.side === "buy" ? "text-gold" : tx.side === "sell" ? "text-flare" : "text-ivory/70"}>
                    {tx.side === "buy" ? "🟢 BUY" : tx.side === "sell" ? "🔴 SELL" : String(tx.side)}
                  </span>
                  <a className="truncate font-mono text-ivory/80 hover:text-gold" href={String(tx.explorer || "#")} target="_blank" rel="noreferrer">
                    {usd(tx.usd)} · {tx.hash ? String(tx.hash).slice(0, 10) : ""}
                  </a>
                </li>
              ))
            ) : (
              <li className="text-sm text-ivory/65">No recent pair-classified trades in the explorer window.</li>
            )}
          </ul>
        </div>
        <div className="panel rounded-xl p-5">
          <h3 className="font-heading text-xl text-ivory">Burns</h3>
          <p className="mt-1 font-mono text-xs text-ivory/70">
            Sample burned {activity?.burnedAmount != null ? Number(activity.burnedAmount).toPrecision(6) : "—"} · {usd(activity?.burnedUsd)}
          </p>
          <ul className="mt-3 space-y-2">
            {burns.length ? (
              burns.map((tx, i) => (
                <li key={String(tx.hash || i)} className="truncate font-mono text-xs text-ivory/80">
                  <a href={String(tx.explorer || "#")} target="_blank" rel="noreferrer" className="hover:text-gold">
                    {tx.amount != null ? Number(tx.amount).toPrecision(6) : "—"} · {tx.hash ? String(tx.hash).slice(0, 10) : ""}
                  </a>
                </li>
              ))
            ) : (
              <li className="text-sm text-ivory/65">No burns to zero/dead in this transfer sample.</li>
            )}
          </ul>
        </div>
      </section>
    </div>
  );
}
