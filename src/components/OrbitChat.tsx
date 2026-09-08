"use client";

import { useState } from "react";
import { useWallet } from "./WalletProvider";
import { explorerTx } from "@/lib/chain";

type Msg = { role: "user" | "assistant"; content: string; tools?: string[] };

export function OrbitChat() {
  const { address, connect, signLaunch } = useWallet();
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Orbit is live on Apogee. Scan a ticker, track a wallet, or say “launch token named Aurora ticker AUR”. I call real MCP tools — I will not invent prices.",
    },
  ]);
  const [prepared, setPrepared] = useState<{ to: string; data: string; value: string } | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  async function send() {
    const prompt = input.trim();
    if (!prompt || busy) return;
    setInput("");
    const history = msgs.map((m) => ({ role: m.role, content: m.content }));
    setMsgs((m) => [...m, { role: "user", content: prompt }]);
    setBusy(true);
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 40_000);
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt, history }),
        signal: ctl.signal,
      });
      const json = await res.json();
      const unsigned = json.prepared?.unsignedTx as { to: string; data: string; value: string } | undefined;
      if (unsigned?.to) setPrepared(unsigned);
      const tools = Array.isArray(json.calls) ? json.calls.map((c: { tool?: string }) => c.tool).filter(Boolean) : [];
      setMsgs((m) => [
        ...m,
        {
          role: "assistant",
          content: json.reply || json.error || "Done.",
          tools,
        },
      ]);
    } catch (e) {
      setMsgs((m) => [...m, { role: "assistant", content: e instanceof Error && e.name === "AbortError" ? "Timed out waiting for Orbit. Try a narrower prompt." : String(e) }]);
    } finally {
      clearTimeout(timer);
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
      <p className="font-script text-lg text-ember">Orbit AI</p>
      <div className="mt-3 flex-1 space-y-3 overflow-y-auto pr-1">
        {msgs.map((m, i) => (
          <div
            key={i}
            className={`max-w-[92%] rounded-xl px-4 py-3 text-sm leading-relaxed ${m.role === "user" ? "ml-auto bg-gold/20 text-ivory" : "bg-black/50 text-ivory"}`}
          >
            <p className="whitespace-pre-wrap">{m.content}</p>
            {m.tools?.length ? (
              <p className="mt-2 font-mono text-[10px] text-gold/90">tools: {m.tools.join(" · ")}</p>
            ) : null}
          </div>
        ))}
        {busy ? <p className="text-sm text-ivory/70">Calling MCP tools…</p> : null}
      </div>
      {prepared ? (
        <div className="mt-4 rounded-xl border border-ember/40 bg-black/50 p-4">
          <p className="kicker text-ember">Unsigned pons launch</p>
          <p className="mt-1 break-all font-mono text-[11px] text-ivory/80">to {prepared.to}</p>
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
        className="mt-4 flex flex-col gap-2 sm:flex-row"
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
        <button type="submit" disabled={busy} className="btn-gold sm:w-28">
          {busy ? "…" : "Send"}
        </button>
      </form>
    </div>
  );
}
