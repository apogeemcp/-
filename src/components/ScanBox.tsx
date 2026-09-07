"use client";

import { useState } from "react";

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
  };
  score?: { total?: number };
};

export function ScanBox() {
  const [q, setQ] = useState("NVDA");
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<Scan | null>(null);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setOut(null);
    try {
      const r = await fetch("/api/v1/scan_token", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      setOut(await r.json().then((j) => (j.result || j) as Scan));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="glass rounded-3xl p-6">
      <p className="text-[10px] uppercase tracking-[0.24em] text-gold">Scan</p>
      <h3 className="mt-1 font-display text-2xl">OG-style score for RH chain</h3>
      <form onSubmit={run} className="mt-4 flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="NVDA, ticker, or 0x…"
          className="flex-1 rounded-full border border-gold/25 bg-black/40 px-4 py-2.5 font-mono text-sm outline-none focus:border-ember"
        />
        <button
          disabled={busy}
          className="rounded-full bg-gradient-to-r from-gold via-ember to-flare px-5 py-2.5 text-sm text-void"
        >
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
          <p className="sm:col-span-4 font-mono text-[11px] text-ivory/50">
            {out.token.symbol} · {out.token.address} · {out.token.canonicalStock ? "canonical stock" : "market token"} ·{" "}
            {out.token.momentumLabel}
          </p>
        </div>
      )}
    </section>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-black/30 p-3">
      <p className="text-[10px] uppercase tracking-[0.18em] text-ivory/40">{k}</p>
      <p className="mt-1 text-sm text-ivory">{v}</p>
    </div>
  );
}
