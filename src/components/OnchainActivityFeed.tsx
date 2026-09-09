"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Activity = {
  id: string;
  event_type: string;
  message: string;
  note_preview?: string | null;
  token_amount?: number | null;
  usd_value?: number | null;
  status: string;
  transaction_signature?: string | null;
  related_transaction_signature?: string | null;
  solscan_url?: string | null;
  created_at: string;
  confirmed_at?: string | null;
  slot?: number | null;
};

type Stats = {
  totalBurnedUsd?: number;
  orbitxBurned?: number;
  totalMemos?: number;
  totalBuys?: number;
  solSpentNative?: number;
};

const TABS = [
  { id: "ALL", label: "All" },
  { id: "MEMOS", label: "Memos" },
  { id: "BUYS", label: "Buys" },
  { id: "BURNS", label: "Burns" },
] as const;

function rel(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 10) return `${s}s`;
  if (s < 60) return `${s} seconds ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h}h`;
  return new Date(iso).toLocaleString();
}

function abs(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function fmtAmt(n: number | null | undefined, digits = 2) {
  if (n == null || !Number.isFinite(Number(n))) return "—";
  const v = Number(n);
  if (v >= 1_000_000) return v.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (v >= 1) return v.toLocaleString(undefined, { maximumFractionDigits: digits });
  return v.toLocaleString(undefined, { maximumFractionDigits: 8 });
}

function meta(type: string) {
  if (type === "ORBITX_BURN") return { icon: "🔥", kicker: "$ORBITX BURN", tone: "border-ember/40 bg-ember/10" };
  if (type === "ORBITX_PURCHASE") return { icon: "🛒", kicker: "$ORBITX PURCHASE", tone: "border-gold/30 bg-gold/10" };
  if (type === "MEMO_CREATED") return { icon: "📝", kicker: "ON-CHAIN MEMO", tone: "border-ivory/15 bg-white/[0.03]" };
  if (type === "TRANSACTION_FAILED") return { icon: "⚠️", kicker: "FAILED", tone: "border-flare/40 bg-flare/10" };
  return { icon: "✓", kicker: "CONFIRMED", tone: "border-emerald-500/30 bg-emerald-500/10" };
}

export function OnchainActivityFeed({ compact = false }: { compact?: boolean }) {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("ALL");
  const [items, setItems] = useState<Activity[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [offset, setOffset] = useState(0);
  const [busy, setBusy] = useState(false);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const seen = useRef<Set<string>>(new Set());

  const load = useCallback(
    async (nextOffset = 0, silent = false) => {
      if (!silent) setBusy(true);
      try {
        const res = await fetch(`/api/onchain/activity?type=${tab}&limit=24&offset=${nextOffset}`);
        const json = await res.json();
        const rows = (json.items || []) as Activity[];
        setStats((prev) => {
          const incoming = json.stats || null;
          if ((!incoming || Number(incoming.totalMemos || 0) === 0) && Number(prev?.totalMemos || 0) > 0) return prev;
          return incoming;
        });
        setOffset(nextOffset);
        setItems((prev) => {
          if (nextOffset === 0 && rows.length === 0 && prev.length > 0) return prev;
          const merged = nextOffset === 0 ? rows : [...prev, ...rows.filter((r) => !prev.some((p) => p.id === r.id))];
          if (nextOffset === 0) {
            const neu = new Set<string>();
            for (const r of rows) {
              if (seen.current.size && !seen.current.has(r.id)) neu.add(r.id);
              seen.current.add(r.id);
            }
            if (neu.size) {
              setFresh(neu);
              setTimeout(() => setFresh(new Set()), 2500);
            }
          }
          return merged;
        });
      } finally {
        setBusy(false);
      }
    },
    [tab],
  );

  useEffect(() => {
    void load(0);
    const t = setInterval(() => void load(0, true), 4000);
    return () => clearInterval(t);
  }, [load]);

  const shown = useMemo(
    () => items.filter((i) => i.event_type !== "TRANSACTION_CONFIRMED" || tab === "ALL"),
    [items, tab],
  );

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="kicker">On-chain activity</p>
          <h2 className="font-heading text-2xl text-ivory">{compact ? "Live feed" : "Apogee on-chain activity"}</h2>
          <p className="mt-1 text-sm text-ivory/70">Confirmed Solana memos, $ORBITX buys, and burns. Nothing is invented.</p>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-5">
        <Stat k="Total burned" v={`$${fmtAmt(stats?.totalBurnedUsd)}`} />
        <Stat k="$ORBITX burned" v={fmtAmt(stats?.orbitxBurned, 0)} />
        <Stat k="Memos" v={fmtAmt(stats?.totalMemos, 0)} />
        <Stat k="Buys" v={fmtAmt(stats?.totalBuys, 0)} />
        <Stat k="SOL spent" v={`${fmtAmt(stats?.solSpentNative, 4)} SOL`} />
      </div>

      <div className="flex gap-1 rounded-full border border-white/10 p-1 text-[11px] uppercase tracking-[0.14em]">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setTab(t.id);
              setItems([]);
              setOffset(0);
            }}
            className={`flex-1 rounded-full px-3 py-2 ${tab === t.id ? "bg-ivory text-void" : "text-ivory/60 hover:text-ivory"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {shown.map((item) => (
          <ActivityCard key={item.id} item={item} flash={fresh.has(item.id)} />
        ))}
        {!shown.length && !busy ? (
          <p className="panel rounded-xl p-6 text-sm text-ivory/70">No confirmed activity yet. Write a note to start the feed.</p>
        ) : null}
      </div>

      {shown.length >= 24 ? (
        <button type="button" className="btn-ghost" disabled={busy} onClick={() => void load(offset + 24)}>
          {busy ? "Loading…" : "Load earlier activity"}
        </button>
      ) : null}
    </section>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="panel rounded-xl px-3 py-3">
      <p className="text-[10px] uppercase tracking-[0.16em] text-ivory/50">{k}</p>
      <p className="mt-1 font-mono text-sm text-ivory">{v}</p>
    </div>
  );
}

function ActivityCard({ item, flash }: { item: Activity; flash: boolean }) {
  const m = meta(item.event_type);
  const [open, setOpen] = useState(false);
  const long = (item.note_preview || "").length > 160;
  const body = item.note_preview && !open && long ? `${item.note_preview.slice(0, 160).trimEnd()}…` : item.note_preview;
  const pending = item.status === "pending";
  const failed = item.status === "failed";
  const href = item.solscan_url || (item.transaction_signature ? `https://solscan.io/tx/${item.transaction_signature}` : null);

  return (
    <article
      className={`panel rounded-2xl p-4 transition ${m.tone} ${flash ? "animate-pulse ring-1 ring-ember/60" : ""}`}
    >
      <div className="flex items-start gap-3">
        <span className="text-lg" aria-hidden>
          {m.icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[11px] uppercase tracking-[0.16em] text-ivory/55">Apogee On-Chain</p>
            <span className="text-[11px] uppercase tracking-[0.14em] text-gold">{m.kicker}</span>
            {pending ? <span className="text-[11px] uppercase tracking-[0.14em] text-ember">Pending…</span> : null}
            {failed ? <span className="text-[11px] uppercase tracking-[0.14em] text-flare">Failed</span> : null}
            <span className="ml-auto font-mono text-[11px] text-ivory/45" title={abs(item.created_at)}>
              {rel(item.created_at)}
            </span>
          </div>
          <p className="mt-1 text-sm text-ivory">{item.message}</p>
          {body ? (
            <blockquote className="mt-2 border-l-2 border-ember/50 pl-3 text-sm leading-relaxed text-ivory/90">
              «{body}»
              {long ? (
                <button type="button" className="ml-2 text-ember" onClick={() => setOpen((v) => !v)}>
                  {open ? "Show less" : "Read more"}
                </button>
              ) : null}
            </blockquote>
          ) : null}
          {item.event_type === "ORBITX_BURN" || item.event_type === "ORBITX_PURCHASE" ? (
            <p className="mt-2 font-mono text-sm text-ivory">
              ${fmtAmt(item.usd_value)} · {fmtAmt(item.token_amount)} $ORBITX
              {item.event_type === "ORBITX_BURN" ? " permanently removed from circulation" : " purchased"}
            </p>
          ) : null}
          {item.slot ? <p className="mt-1 font-mono text-[11px] text-ivory/45">Slot {item.slot}</p> : null}
          <p className="mt-1 text-[11px] text-ivory/40">{abs(item.created_at)}</p>
          <div className="mt-3 flex flex-wrap gap-3 text-[12px]">
            {href && item.transaction_signature ? (
              <a className="text-ember hover:text-ivory" href={href} target="_blank" rel="noreferrer">
                {item.event_type === "ORBITX_BURN" ? "View burn →" : item.event_type === "ORBITX_PURCHASE" ? "View buy →" : "View on Solscan →"}
              </a>
            ) : null}
            {item.related_transaction_signature ? (
              <a
                className="text-ivory/60 hover:text-ivory"
                href={`https://solscan.io/tx/${item.related_transaction_signature}`}
                target="_blank"
                rel="noreferrer"
              >
                Related tx →
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}
