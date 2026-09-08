"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TokenMedia } from "./TokenMedia";

export type PonsLaunch = {
  generation?: "v1" | "v2";
  token?: string;
  name?: string | null;
  symbol?: string | null;
  logo?: string | null;
  quote?: string;
  graduated?: boolean;
  progress?: number | null;
  phase?: string;
  priceUsd?: number | null;
  txHash?: string | null;
  blockNumber?: number | null;
  thresholdEth?: number | null;
};

function Progress({ value }: { value: number | null | undefined }) {
  const pct = Math.round(Math.max(0, Math.min(value ?? 0, 1)) * 100);
  return (
    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
      <div
        className="h-full rounded-full bg-gradient-to-r from-gold via-ember to-flare"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function LaunchGrid({ launches, compact = false }: { launches: PonsLaunch[]; compact?: boolean }) {
  if (!launches.length) {
    return <p className="text-sm text-ivory/50">No pons launches in this window.</p>;
  }
  return (
    <div className={`grid gap-3 ${compact ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
      {launches.map((l) => (
        <Link
          key={l.token}
          href={`/token/${l.token}`}
          className="group rounded-[16px] border border-white/10 bg-black/35 p-4 transition hover:-translate-y-0.5 hover:border-ember/40"
        >
          <div className="flex items-start gap-3">
            <TokenMedia src={l.logo} symbol={l.symbol} name={l.name} size={40} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-ivory">
                {l.name || l.symbol || "untitled"}{" "}
                <span className="text-ivory/40">{l.symbol}</span>
              </p>
              <p className="font-mono text-[10px] text-ivory/40">
                {l.generation} · {l.quote} · {l.phase || (l.graduated ? "graduated" : "live")}
              </p>
            </div>
            <span className="text-[10px] uppercase tracking-[0.16em] text-ember">
              {l.graduated ? "grad" : `${Math.round((l.progress || 0) * 100)}%`}
            </span>
          </div>
          <Progress value={l.progress} />
          <p className="mt-2 font-mono text-[11px] text-ivory/45">
            {l.priceUsd != null
              ? `$${l.priceUsd < 0.01 ? l.priceUsd.toExponential(2) : l.priceUsd.toPrecision(4)}`
              : "curve / pool"}
            {l.thresholdEth ? ` · ${l.thresholdEth} ETH thresh` : ""}
          </p>
        </Link>
      ))}
    </div>
  );
}

export function LaunchPad() {
  const [rows, setRows] = useState<PonsLaunch[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ counted?: { v2?: number; v1?: number }; attribution?: string } | null>(null);

  useEffect(() => {
    let live = true;
    fetch("/api/v1/list_pons_launches?limit=18&lookback=8000")
      .then((r) => r.json())
      .then((j) => {
        if (!live) return;
        const result = j.result || j;
        if (j.ok === false && !result?.launches) setError(j.error || "launches failed");
        else {
          setRows(result.launches || []);
          setMeta(result);
        }
      })
      .catch((e) => live && setError(String(e)));
    return () => {
      live = false;
    };
  }, []);

  if (error) return <p className="text-sm text-flare">{error}</p>;
  if (!rows) return <p className="animate-pulse text-sm text-ivory/50">Indexing pons factories…</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.24em] text-gold">pons launches</p>
          <p className="mt-1 text-xs text-ivory/50">
            {meta?.counted?.v2 ?? 0} v2 + {meta?.counted?.v1 ?? 0} v1 in this window · on-chain logs, not an API
          </p>
        </div>
        <a
          href="https://www.ponsfamily.com/launchpad"
          className="text-[11px] uppercase tracking-[0.18em] text-ember hover:text-gold"
          target="_blank"
          rel="noopener noreferrer"
        >
          pons app ↗
        </a>
      </div>
      <LaunchGrid launches={rows} />
      <p className="text-[11px] leading-relaxed text-ivory/40">
        Write <span className="text-gold">pons</span> in lowercase. Apogee is not operated by pons. Graduation is not a
        quality signal. Always resolve by token address.
      </p>
    </div>
  );
}
