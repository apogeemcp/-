"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CopyButton, TokenMedia } from "./TokenMedia";
import { Hint } from "./InfoBits";
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

function ago(ts: unknown) {
  const n = typeof ts === "number" ? ts : Number(ts);
  if (!Number.isFinite(n) || n <= 0) return "";
  const s = Math.max(0, Math.floor(Date.now() / 1000 - n));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
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
  const [siblings, setSiblings] = useState<AnyRec[]>([]);
  const [tf, setTf] = useState<{ timeframe: string; aggregate: number; label: string; limit: number }>({
    timeframe: "day",
    aggregate: 1,
    label: "1D",
    limit: 180,
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
    const tick = () => {
      tool("get_token_activity", { query: address })
        .then((act) => live && setActivity(act))
        .catch(() => null);
    };
    const id = setInterval(tick, 20_000);
    return () => {
      live = false;
      clearInterval(id);
    };
  }, [address]);

  useEffect(() => {
    let live = true;
    tool("get_chart", {
      query: address,
      timeframe: tf.timeframe,
      aggregate: String(tf.aggregate),
      limit: String(tf.limit),
    })
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

  useEffect(() => {
    const creator = String((pons as { deployer?: string; launch?: { deployer?: string } } | null)?.deployer || (pons as { launch?: { deployer?: string } } | null)?.launch?.deployer || "");
    if (!creator) return;
    let live = true;
    tool("list_pons_launches", { limit: "24" })
      .then((j) => {
        if (!live) return;
        const rows = ((j.launches as AnyRec[]) || []).filter((l) => String(l.deployer || "").toLowerCase() === creator.toLowerCase());
        setSiblings(rows);
      })
      .catch(() => null);
    return () => {
      live = false;
    };
  }, [pons]);

  const t = (token?.token || token || {}) as AnyRec;
  const socials = (t.socials || {}) as { website?: string | null; x?: string | null; telegram?: string | null; discord?: string | null; image?: string | null; banner?: string | null };
  const meta = (pons?.meta || {}) as AnyRec;
  const image = String(t.image || socials.image || meta.logo || "") || null;
  const banner = String(t.banner || socials.banner || "") || null;
  const ca = String(t.address || address);
  const bars = (chart?.bars as Array<Record<string, number>>) || [];
  const trades = ((activity?.trades || []) as Array<AnyRec>).slice(0, 24);
  const burns = ((activity?.burns || []) as Array<AnyRec>).slice(0, 16);
  const topHolders = ((holders?.top || []) as Array<AnyRec>).slice(0, 12);
  const onchain = (token?.onchain || {}) as AnyRec;
  const flags = (token?.flags || {}) as AnyRec;
  const position = useMemo(() => {
    const rows = (pnl?.positions as Array<AnyRec> | undefined) || [];
    return rows.find((p) => String(p.token || "").toLowerCase() === ca.toLowerCase()) || null;
  }, [pnl, ca]);
  const fees = (pons?.fees || pons?.feePolicy || null) as AnyRec | null;
  const creator = String(pons?.deployer || meta.tokenDeployer || (pons?.launch as AnyRec | undefined)?.deployer || "");

  if (busy) {
    return (
      <div className="space-y-4">
        <div className="panel h-40 animate-pulse rounded-xl" />
        <div className="grid gap-3 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="panel h-20 animate-pulse rounded-xl" />
          ))}
        </div>
        <p className="text-sm text-ivory/70">Loading token terminal…</p>
      </div>
    );
  }
  if (error) return <p className="text-sm text-flare">{error}</p>;

  const frames = [
    { label: "1m", timeframe: "minute", aggregate: 1, limit: 180 },
    { label: "5m", timeframe: "minute", aggregate: 5, limit: 180 },
    { label: "15m", timeframe: "minute", aggregate: 15, limit: 180 },
    { label: "1h", timeframe: "hour", aggregate: 1, limit: 180 },
    { label: "4h", timeframe: "hour", aggregate: 4, limit: 180 },
    { label: "1D", timeframe: "day", aggregate: 1, limit: 180 },
    { label: "ALL", timeframe: "day", aggregate: 1, limit: 1000 },
  ];

  return (
    <div className="space-y-6">
      {banner ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={banner} alt="" className="h-28 w-full rounded-xl object-cover ring-1 ring-white/10 sm:h-40" loading="lazy" />
      ) : null}
      <section className="panel rounded-xl p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <TokenMedia src={image} symbol={String(t.symbol || "")} name={String(t.name || "")} size={52} />
            <div className="min-w-0">
              <h2 className="font-heading text-2xl text-ivory sm:text-3xl">
                {String(t.name || meta.name || "Token")}{" "}
                <span className="font-mono text-base text-gold">{String(t.symbol || meta.symbol || "")}</span>
              </h2>
              <p className="mt-1 text-sm text-ivory/75">
                {CHAIN.name} · {t.canonicalStock ? "canonical Stock Token" : pons ? `pons ${pons.generation || ""}` : "market token"}
                {t.gtVerified ? " · Gecko verified" : ""}
              </p>
              <p className="mt-2 break-all font-mono text-xs text-ivory/80">{ca}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <CopyButton value={ca} />
                <a className="btn-ghost text-xs" href={explorerToken(ca)} target="_blank" rel="noreferrer">
                  Explorer
                </a>
                {socials.website || t.description ? (
                  socials.website ? (
                    <a className="btn-ghost text-xs" href={String(socials.website)} target="_blank" rel="noreferrer">
                      Website
                    </a>
                  ) : null
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
                {socials.discord ? (
                  <a className="btn-ghost text-xs" href={String(socials.discord)} target="_blank" rel="noreferrer">
                    Discord
                  </a>
                ) : null}
              </div>
            </div>
          </div>
          <dl className="grid min-w-[12rem] grid-cols-2 gap-3 sm:text-right">
            <div>
              <dt className="kicker">
                Price
              </dt>
              <dd className="font-mono text-lg text-ivory">{usd(t.priceUsd ?? analytics?.priceUsd)}</dd>
            </div>
            <div>
              <dt className="kicker">Mcap</dt>
              <dd className="font-mono text-lg text-ivory">{usd(t.mcap ?? t.marketCap ?? t.fdv)}</dd>
            </div>
          </dl>
        </div>
        {t.description || meta.description ? (
          <p className="mt-4 text-sm leading-relaxed text-ivory/75">{String(t.description || meta.description)}</p>
        ) : null}
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(
          [
            ["Liquidity", usd(t.liquidity ?? analytics?.liquidityUsd), "liquidity"],
            ["Volume 24h", usd(t.volume24h ?? analytics?.volume), "volume"],
            ["Buys / sells", `${analytics?.buys ?? activity?.buys ?? "—"} / ${analytics?.sells ?? activity?.sells ?? "—"}`, "ratio"],
            ["Change", analytics?.changePct != null ? `${Number(analytics.changePct).toFixed(2)}%` : "—", ""],
            ["Supply", t.totalSupply != null ? String(t.totalSupply) : onchain.totalSupply != null ? String(onchain.totalSupply) : "—", "mcap"],
            ["Decimals", t.decimals != null ? String(t.decimals) : onchain.decimals != null ? String(onchain.decimals) : "—", ""],
            ["Score", token?.score && typeof token.score === "object" ? String((token.score as AnyRec).total ?? "—") : "—", "risk"],
            ["Risk", flags.unverifiedLookalike ? "lookalike flag" : flags.tickerCollision ? "ticker collision" : t.canonicalStock ? "canonical" : "unscored extras", "risk"],
          ] as Array<[string, string, keyof typeof import("@/lib/copy").GLOSSARY | ""]>
        ).map(([k, v, hint]) => (
          <div key={k} className="panel p-4">
            <p className="kicker">
              {k}
              {hint ? <Hint id={hint} /> : null}
            </p>
            <p className="mt-2 break-all font-mono text-sm text-ivory">{v}</p>
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
        {chart?.ok === false ? <p className="text-sm text-ivory/70">{String(chart.error)}</p> : <PriceChart bars={bars} />}
      </section>

      {position ? (
        <section className="panel p-5">
          <h3 className="font-heading text-xl text-ivory">
            Your position <Hint id="pnl" />
          </h3>
          <p className="mt-2 font-mono text-sm text-ivory">
            {String(position.formatted)} {String(position.symbol || t.symbol || "")} · mark {usd(position.usd)}
          </p>
          <p className="mt-2 text-xs text-ivory/70">
            Mark-to-market only. Cost basis is not recovered when explorer history is truncated — no fabricated PnL.
          </p>
        </section>
      ) : wallet ? (
        <section className="panel p-5">
          <h3 className="font-heading text-xl text-ivory">
            Your position <Hint id="pnl" />
          </h3>
          <p className="mt-2 text-sm text-ivory/75">Connected wallet has no watched balance in this token.</p>
        </section>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="panel rounded-xl p-5">
          <h3 className="font-heading text-xl text-ivory">
            Holders (proxy) <Hint id="holders" />
          </h3>
          <p className="mt-1 text-xs text-ivory/70">
            {holders?.holderCountProxy != null ? `${holders.holderCountProxy} wallets in sample` : "No holder sample"}
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
              <li className="text-sm text-ivory/70">{String(holders?.note || "No holder proxy yet.")}</li>
            )}
          </ul>
        </div>
        <div className="panel rounded-xl p-5">
          <h3 className="font-heading text-xl text-ivory">
            Creator / fees <Hint id="fees" />
          </h3>
          {pons ? (
            <dl className="mt-3 space-y-2 text-sm text-ivory/80">
              <div className="flex justify-between gap-3">
                <dt>Generation</dt>
                <dd className="font-mono">{String(pons.generation || "—")}</dd>
              </div>
              {creator ? (
                <div className="flex justify-between gap-3">
                  <dt>Creator</dt>
                  <dd>
                    <Link className="font-mono text-gold" href={`/wallet?address=${creator}`}>
                      {shortAddress(creator)}
                    </Link>
                  </dd>
                </div>
              ) : null}
              {fees ? (
                <div className="text-xs">
                  <dt className="kicker">Fee policy (on-chain)</dt>
                  <dd className="mt-1 font-mono text-ivory/80">
                    {fees.creatorSharePct != null
                      ? `creator ${fees.creatorSharePct}% · protocol ${fees.protocolSharePct}%`
                      : fees.creatorPct != null
                        ? `creator ${fees.creatorPct}%`
                        : JSON.stringify(fees)}
                  </dd>
                </div>
              ) : (
                <p className="text-xs text-ivory/70">Fee totals are not fully indexed. Split policy is shown when the locker returns it.</p>
              )}
              {siblings.length ? (
                <div>
                  <dt>Other launches by creator in this window</dt>
                  <dd className="mt-1 space-y-1">
                    {siblings.slice(0, 6).map((l) => (
                      <Link key={String(l.token)} href={`/token/${l.token}`} className="block font-mono text-xs text-gold">
                        {String(l.symbol || l.name || l.token)}
                      </Link>
                    ))}
                  </dd>
                </div>
              ) : (
                <p className="text-xs text-ivory/70">No other pons launches by this deployer in the current log window.</p>
              )}
            </dl>
          ) : (
            <p className="mt-3 text-sm text-ivory/70">No pons factory record for this contract. Creator/fee fields stay empty rather than guessed.</p>
          )}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="panel rounded-xl p-5">
          <h3 className="font-heading text-xl text-ivory">Live buys / sells</h3>
          <p className="mt-1 text-xs text-ivory/70">{String(activity?.note || "Refreshing every 20s.")}</p>
          <ul className="mt-3 space-y-2">
            {trades.length ? (
              trades.map((tx, i) => (
                <li key={String(tx.hash || i)} className="grid grid-cols-[4.5rem_1fr_auto] items-baseline gap-2 text-xs">
                  <span className={tx.side === "buy" ? "text-gold" : tx.side === "sell" ? "text-flare" : "text-ivory/70"}>
                    {tx.side === "buy" ? "🟢 BUY" : tx.side === "sell" ? "🔴 SELL" : String(tx.side)}
                  </span>
                  <Link className="truncate font-mono text-ivory/80 hover:text-gold" href={`/wallet?address=${tx.wallet || tx.to || ""}`}>
                    {shortAddress(String(tx.wallet || tx.to || ""))}
                  </Link>
                  <a className="font-mono text-ivory/80 hover:text-gold" href={String(tx.explorer || "#")} target="_blank" rel="noreferrer">
                    {usd(tx.usd)} {ago(tx.timestamp)}
                  </a>
                </li>
              ))
            ) : (
              <li className="text-sm text-ivory/70">No recent classified trades yet.</li>
            )}
          </ul>
        </div>
        <div className="panel rounded-xl p-5">
          <h3 className="font-heading text-xl text-ivory">
            Burns <Hint id="burns" />
          </h3>
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
              <li className="text-sm text-ivory/70">No burns in this sample. Explorer transfers are often Cloudflare-gated; we do not invent burns.</li>
            )}
          </ul>
        </div>
      </section>
    </div>
  );
}
