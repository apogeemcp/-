"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type Scan = {
  ok?: boolean;
  error?: string;
  verdict?: string;
  token?: {
    symbol?: string;
    name?: string;
    address?: string;
    priceUsd?: number | null;
    liquidity?: number | null;
    momentumLabel?: string;
    canonicalStock?: boolean;
    dexPremiumBps?: number | null;
    image?: string | null;
  };
  score?: { total?: number };
  pons?: {
    generation?: string;
    venue?: string;
    graduation?: { progress?: number; graduated?: boolean; phase?: string; note?: string };
    meta?: { logo?: string | null; description?: string | null };
  };
};

export function ScanBox() {
  const params = useSearchParams();
  const [q, setQ] = useState("NVDA");
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<Scan | null>(null);

  async function runQuery(query: string) {
    setBusy(true);
    setOut(null);
    try {
      const r = await fetch("/api/v1/scan_token", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query }),
      });
      setOut(await r.json().then((j) => (j.result || j) as Scan));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    const scan = params.get("scan");
    if (scan) {
      setQ(scan);
      void runQuery(scan);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    await runQuery(q);
  }

  const progress = out?.pons?.graduation?.progress;

  return (
    <section className="panel rounded-xl p-6">
      <p className="kicker">Scan</p>
      <h3 className="mt-1 font-display text-2xl">OG-style score for RH chain</h3>
      <form onSubmit={run} className="mt-4 flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="NVDA, ticker, or 0x…"
          className="field flex-1 font-mono"
        />
        <button disabled={busy} className="btn-gold">
          {busy ? "Scanning" : "Scan"}
        </button>
      </form>
      {out?.error && <p className="mt-4 text-sm text-flare">{out.error}</p>}
      {out?.token && (
        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          <Stat k="Score" v={String(out.score?.total ?? "—")} />
          <Stat k="Verdict" v={out.verdict || "—"} />
          <Stat k="Price" v={out.token.priceUsd != null ? `$${Number(out.token.priceUsd).toLocaleString(undefined, { maximumFractionDigits: 6 })}` : "—"} />
          <Stat k="Liq" v={out.token.liquidity != null ? `$${Math.round(out.token.liquidity).toLocaleString()}` : "—"} />
          {out.pons && (
            <div className="rounded-xl border border-gold/20 bg-black/30 p-3 sm:col-span-4">
              <p className="text-[10px] uppercase tracking-[0.18em] text-gold">
                pons {out.pons.generation} · {out.pons.venue}
              </p>
              <p className="mt-1 text-sm text-ivory/70">
                {out.pons.graduation?.graduated ? "Graduated" : "In flight"} ·{" "}
                {Math.round((progress || 0) * 100)}% to threshold
                {out.pons.graduation?.phase ? ` · ${out.pons.graduation.phase}` : ""}
              </p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full bg-gradient-to-r from-gold via-ember to-flare"
                  style={{ width: `${Math.round((progress || 0) * 100)}%` }}
                />
              </div>
              <p className="mt-2 text-[11px] text-ivory/40">{out.pons.graduation?.note}</p>
            </div>
          )}
          <p className="sm:col-span-4 font-mono text-[11px] text-ivory/80">
            {out.token.symbol} · {out.token.address} · {out.token.canonicalStock ? "canonical stock" : "market token"} ·{" "}
            {out.token.momentumLabel}
            {out.token.address ? (
              <>
                {" "}
                ·{" "}
                <a className="text-gold" href={`/token/${out.token.address}`}>
                  Open terminal
                </a>
              </>
            ) : null}
          </p>
        </div>
      )}
    </section>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-xl border border-white/5 bg-black/30 p-3">
      <p className="text-[10px] uppercase tracking-[0.18em] text-ivory/40">{k}</p>
      <p className="mt-1 text-sm text-ivory">{v}</p>
    </div>
  );
}
