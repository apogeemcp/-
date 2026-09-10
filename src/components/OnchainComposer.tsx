"use client";

import { useEffect, useMemo, useState } from "react";
import { NOTE_MAX_CHARS, ORBITX_RESERVE_USD } from "@/lib/onchain-config";
import { readResponseJson } from "@/lib/read-json";
import { useWallet } from "./WalletProvider";
import { NoteHoloCard } from "./HoloCard";

type Note = {
  id: string;
  note: string;
  memo: string;
  memoStatus: string;
  buyStatus: string;
  burnStatus: string;
  memoTx: string | null;
  buyTx: string | null;
  burnTx: string | null;
  memoUrl: string | null;
  buyUrl: string | null;
  burnUrl: string | null;
  tokenAmount: number | null;
  usdValue: number | null;
  priceUsd?: number | null;
  createdAt: string;
  error: string | null;
};

type WalletInfo = {
  wallet: string;
  sol: number;
  ready: boolean;
  notesEnabled: boolean;
  autoBurnEnabled: boolean;
  noteBurnUsd: number;
  estimatedSolForNote: number | null;
  marketPriceUsd?: number | null;
  sqlReady?: boolean;
  stats?: { totalMemos?: number };
};

export function OnchainComposer() {
  const { address, verified } = useWallet();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [last, setLast] = useState<Note | null>(null);
  const [history, setHistory] = useState<Note[]>([]);
  const [info, setInfo] = useState<WalletInfo | null>(null);

  const remaining = NOTE_MAX_CHARS - text.length;

  async function refresh() {
    try {
      const [w, h] = await Promise.all([
        fetch("/api/onchain/wallet").then((r) => readResponseJson<WalletInfo & { ok?: boolean }>(r)),
        fetch("/api/onchain/notes?limit=20").then((r) => readResponseJson<{ items?: Note[] }>(r)),
      ]);
      setInfo((prev) => {
        if (!w?.ok) return prev;
        if (prev && Number(w.sol || 0) === 0 && prev.sol > 0) return { ...w, sol: prev.sol };
        return w;
      });
      setHistory((prev) => {
        const rows = Array.isArray(h.items) ? (h.items as Note[]) : [];
        if (rows.length === 0 && prev.length > 0) return prev;
        return rows;
      });
    } catch {
      /* keep last-good composer state */
    }
  }

  useEffect(() => {
    void refresh();
    const t = setInterval(() => void refresh(), 8000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!last?.id) return;
    if (last.memoStatus === "confirmed" && last.buyStatus === "confirmed" && last.burnStatus === "confirmed") return;
    if (last.buyStatus === "failed" || last.burnStatus === "failed") return;
    let cancelled = false;
    async function tick() {
      if (cancelled || !last?.id) return;
      try {
        const resume = last.buyStatus === "idle" || last.burnStatus === "idle" ? "?resume=1" : "";
        const res = await fetch(`/api/onchain/notes/${encodeURIComponent(last.id)}${resume}`);
        const json = await readResponseJson<{ note?: Note }>(res);
        if (!cancelled && json.note) setLast(json.note);
      } catch {
        /* keep the receipt we already have */
      }
    }
    void tick();
    const t = setInterval(() => void tick(), 2000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [last?.id, last?.memoStatus, last?.buyStatus, last?.burnStatus]);

  const canWrite = useMemo(() => text.trim().length > 0 && remaining >= 0 && !busy, [text, remaining, busy]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/onchain/notes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          note: text,
          idempotencyKey: crypto.randomUUID(),
          wallet: verified ? address : undefined,
        }),
      });
      const json = await readResponseJson<{ error?: string; note?: Note }>(res);
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      if (!json.note) throw new Error("Memo was sent but the receipt was empty. Refresh the feed.");
      setLast(json.note);
      setText("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="panel rounded-2xl p-5">
        <label htmlFor="onchain-note" className="kicker">
          Write a permanent note
        </label>
        <textarea
          id="onchain-note"
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, NOTE_MAX_CHARS))}
          rows={5}
          placeholder="This text is public forever on Solana. Do not include secrets or personal data."
          className="field mt-3 w-full rounded-xl"
        />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[12px] text-ivory/55">
          <span>{remaining} characters left</span>
          <span>Network fee ≈ {info?.estimatedSolForNote != null ? `${info.estimatedSolForNote.toFixed(5)} SOL` : "pending market"}</span>
        </div>
        <div className="mt-3 grid gap-2 text-[12px] text-ivory/70 sm:grid-cols-3">
          <p>Service wallet · {info?.wallet ? `${info.wallet.slice(0, 4)}…${info.wallet.slice(-4)}` : "—"}</p>
          <p>$ORBITX · {info?.marketPriceUsd != null ? `$${Number(info.marketPriceUsd).toPrecision(4)}` : "pending market"}</p>
          <p>Notes recorded · {info?.stats?.totalMemos ?? 0}</p>
        </div>
        <p className="mt-3 text-[12px] text-ivory/55">
          Each qualifying note buys and burns ${info?.noteBurnUsd ?? 0.03} of $ORBITX. The service wallet keeps a $
          {ORBITX_RESERVE_USD.toFixed(2)} $ORBITX float so the token account stays open and later buys stay under a cent of
          fees.
          {info && !info.notesEnabled ? " Notes are currently paused." : ""}
          {info && !info.autoBurnEnabled ? " Auto-burn is paused." : ""}
          {info && !info.ready ? " Service wallet key is not configured on this host — memos will not sign." : ""}
        </p>
        <button type="submit" className="btn-primary mt-4" disabled={!canWrite || info?.notesEnabled === false}>
          {busy ? "Writing on-chain…" : "Write on-chain"}
        </button>
        {error ? <p className="mt-3 text-sm text-flare">{error}</p> : null}
      </form>

      {last ? (
        <div className="max-w-sm">
          <NoteHoloCard note={last} />
        </div>
      ) : null}

      <section>
        <h3 className="font-heading text-3xl italic text-ivory">Memo cards</h3>
        <p className="mt-1 text-sm text-ivory/65">Indexed from confirmed service-wallet memos. Solana is the source of truth; SQL keeps this list fast.</p>
        <div className="mt-5 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {history.map((n) => (
            <NoteHoloCard key={n.id} note={n} />
          ))}
        </div>
        {!history.length ? <p className="mt-4 text-sm text-ivory/60">No memos on the service wallet yet.</p> : null}
      </section>
    </div>
  );
}
