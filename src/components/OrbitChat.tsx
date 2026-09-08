"use client";

import { useState } from "react";
import { useWallet } from "./WalletProvider";
import { explorerTx } from "@/lib/chain";

type Msg = { role: "user" | "assistant"; content: string; data?: unknown };

export function OrbitChat() {
  const { address, connect, signLaunch } = useWallet();
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Orbit is live. Scan tokens, track a wallet, or say “launch token named Aurora ticker AUR” — I’ll prep a pons v2 tx for Phantom on Robinhood Chain.",
    },
  ]);
  const [prepared, setPrepared] = useState<{ to: string; data: string; value: string } | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  async function send(text?: string) {
    const prompt = (text || input).trim();
    if (!prompt || busy) return;
    setInput("");
    setMsgs((m) => [...m, { role: "user", content: prompt }]);
    setBusy(true);
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const json = await res.json();
      const unsigned = json.prepared?.unsignedTx as { to: string; data: string; value: string } | undefined;
      if (unsigned?.to) setPrepared(unsigned);
      setMsgs((m) => [...m, { role: "assistant", content: json.reply || json.error || "Done.", data: json.calls }]);
    } catch (e) {
      setMsgs((m) => [...m, { role: "assistant", content: String(e) }]);
    } finally {
      setBusy(false);
    }
  }

  async function sign() {
    if (!prepared) return;
    if (!address) await connect();
    const hash = await signLaunch(prepared);
    setTxHash(hash);
  }

  return (
    <div className="panel flex min-h-[32rem] flex-col rounded-xl p-5">
      <div className="flex-1 space-y-3 overflow-y-auto pr-1">
        {msgs.map((m, i) => (
          <div
            key={i}
            className={`max-w-[90%] rounded-xl px-4 py-3 text-sm ${m.role === "user" ? "ml-auto bg-gold/15 text-ivory" : "bg-black/40 text-ivory/80"}`}
          >
            <p className="whitespace-pre-wrap">{m.content}</p>
          </div>
        ))}
      </div>
      {prepared ? (
        <div className="mt-4 rounded-xl border border-ember/40 bg-black/40 p-4">
          <p className="kicker text-ember">Unsigned pons launch</p>
          <p className="mt-1 font-mono text-[11px] text-ivory/60">to {prepared.to}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={sign} className="btn-gold">
              Sign in Phantom
            </button>
            {txHash ? (
              <a className="btn-ghost text-gold" href={explorerTx(txHash)} target="_blank" rel="noreferrer">
                {txHash.slice(0, 10)}… ↗
              </a>
            ) : null}
          </div>
        </div>
      ) : null}
      <form
        className="mt-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Scan NVDA · track 0x… · launch token named Ember ticker EMB"
          className="field flex-1"
        />
        <button type="submit" disabled={busy} className="btn-gold">
          {busy ? "…" : "Send"}
        </button>
      </form>
    </div>
  );
}
