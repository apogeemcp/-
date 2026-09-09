"use client";

import { useEffect, useMemo, useState } from "react";
import { NOTE_MAX_CHARS, SERVICE_WALLET_PUBLIC } from "@/lib/onchain-config";
import { useWallet } from "./WalletProvider";
import { RawOnchainMemo, SolscanMemoLinks } from "./SolscanMemoLinks";

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
  stats?: { totalMemos?: number };
};

function mark(status: string) {
  if (status === "confirmed") return "✓";
  if (status === "pending") return "…";
  if (status === "failed") return "✕";
  return "–";
}

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
    const [w, h] = await Promise.all([
      fetch("/api/onchain/wallet").then((r) => r.json()),
      fetch("/api/onchain/notes?limit=20").then((r) => r.json()),
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
  }

  useEffect(() => {
    void refresh();
    const t = setInterval(() => void refresh(), 8000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!last?.id) return;
    if (last.memoStatus === "confirmed" && last.buyStatus === "confirmed" && last.burnStatus === "confirmed") return;
    const t = setInterval(async () => {
      const res = await fetch(`/api/onchain/notes/${encodeURIComponent(last.id)}?resume=1`);
      const json = await res.json();
      if (json.note) setLast(json.note);
    }, 5000);
    return () => clearInterval(t);
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
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
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
          <p>Network · Solana mainnet</p>
          <p>Notes recorded · {info?.stats?.totalMemos ?? 0}</p>
        </div>
        <p className="mt-3 text-[12px] text-ivory/55">
          Each qualifying note targets ${info?.noteBurnUsd ?? 0.02} of $ORBITX buy-and-burn after the memo confirms.
          {info && !info.notesEnabled ? " Notes are currently paused." : ""}
          {info && !info.autoBurnEnabled ? " Auto-burn is paused." : ""}
          {info && !info.ready ? " Service wallet key is not configured on this host — memos will not sign." : ""}
        </p>
        <button type="submit" className="btn-primary mt-4" disabled={!canWrite || info?.notesEnabled === false}>
          {busy ? "Writing on-chain…" : "Write on-chain"}
        </button>
        {error ? <p className="mt-3 text-sm text-flare">{error}</p> : null}
      </form>

      {last ? <NoteReceipt note={last} /> : null}

      <section>
        <h3 className="font-heading text-xl text-ivory">Note history</h3>
        <p className="mt-1 text-sm text-ivory/65">Indexed from confirmed service-wallet memos. The chain is the source of truth.</p>
        <div className="mt-3 space-y-3">
          {history.map((n) => (
            <HistoryRow key={n.id} note={n} />
          ))}
          {!history.length ? <p className="text-sm text-ivory/60">No memos on the service wallet yet.</p> : null}
        </div>
      </section>
    </div>
  );
}

function NoteReceipt({ note }: { note: Note }) {
  const done = note.memoStatus === "confirmed";
  return (
    <div className="panel rounded-2xl border-emerald-500/30 p-5">
      <p className="text-[11px] uppercase tracking-[0.16em] text-emerald-300">{done ? "✓ Recorded on Solana" : "Broadcasting…"}</p>
      <blockquote className="mt-2 text-ivory">«{note.note}»</blockquote>
      {note.memo ? <RawOnchainMemo memo={note.memo} /> : null}
      <dl className="mt-3 grid gap-1 font-mono text-[12px] text-ivory/75">
        <div>Signature · {note.memoTx || "pending"}</div>
        <div>Time · {new Date(note.createdAt).toLocaleString()}</div>
        <div>Buy · {mark(note.buyStatus)} {note.usdValue != null ? `$${note.usdValue}` : ""}</div>
        <div>Burn · {mark(note.burnStatus)} {note.tokenAmount != null ? `${note.tokenAmount} $ORBITX` : ""}</div>
      </dl>
      {note.error ? <p className="mt-2 text-sm text-flare">{note.error}</p> : null}
      <div className="mt-3 flex flex-wrap gap-3 text-sm">
        {note.memoTx ? <SolscanMemoLinks signature={note.memoTx} wallet={SERVICE_WALLET_PUBLIC} /> : null}
        {note.buyUrl ? (
          <a className="text-ember" href={note.buyUrl} target="_blank" rel="noreferrer">
            Buy TX →
          </a>
        ) : null}
        {note.burnUrl ? (
          <a className="text-ember" href={note.burnUrl} target="_blank" rel="noreferrer">
            Burn TX →
          </a>
        ) : null}
      </div>
    </div>
  );
}

function HistoryRow({ note }: { note: Note }) {
  return (
    <article className="panel rounded-xl p-4">
      <p className="text-sm text-ivory">«{note.note}»</p>
      {note.memo ? <RawOnchainMemo memo={note.memo} /> : null}
      <p className="mt-1 text-[11px] text-ivory/45">{new Date(note.createdAt).toLocaleString()}</p>
      <p className="mt-2 text-[12px] uppercase tracking-[0.12em] text-ivory/70">
        Memo {mark(note.memoStatus)} · Buy {mark(note.buyStatus)} · Burn {mark(note.burnStatus)}
        {note.usdValue != null ? ` · $${note.usdValue}` : ""}
      </p>
      <div className="mt-2 flex flex-wrap gap-3 text-[12px]">
        {note.memoTx ? <SolscanMemoLinks signature={note.memoTx} /> : null}
        {note.buyUrl ? (
          <a className="text-ember" href={note.buyUrl} target="_blank" rel="noreferrer">
            View buy
          </a>
        ) : null}
        {note.burnUrl ? (
          <a className="text-ember" href={note.burnUrl} target="_blank" rel="noreferrer">
            View burn
          </a>
        ) : null}
      </div>
    </article>
  );
}
