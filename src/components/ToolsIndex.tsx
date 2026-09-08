"use client";

import { useMemo, useState } from "react";
import { TOOLS, type ToolDef } from "@/lib/tools";

const GROUPS: Array<{ id: string; title: string; match: (t: ToolDef) => boolean }> = [
  { id: "search", title: "Search & scan", match: (t) => /search|scan|verify|safety|stock_quote|list_stock|corporate/.test(t.name) },
  { id: "chart", title: "Charts & markets", match: (t) => /chart|pair|swap|trending|top_pool|boosted|market_overview|desk/.test(t.name) },
  { id: "launch", title: "pons launch", match: (t) => /pons|launch|curve|prepare_pons|preview_pons/.test(t.name) },
  { id: "wallet", title: "Wallet & profile", match: (t) => /wallet|pnl|track_wallet/.test(t.name) },
  { id: "token", title: "Token intel", match: (t) => /holder|activity|analytic|trader|smart|first_buy|contract|compare|get_token/.test(t.name) },
  { id: "chain", title: "Chain & MCP", match: (t) => /chain|gas|block|transaction|mcp|status|catalog|run_tool|add_robinhood/.test(t.name) },
];

function exampleRequest(t: ToolDef) {
  const props = (t.inputSchema.properties || {}) as Record<string, { description?: string; enum?: string[] }>;
  const required = (t.inputSchema.required as string[] | undefined) || Object.keys(props);
  const args: Record<string, string> = {};
  for (const key of required.slice(0, 4)) {
    const p = props[key];
    args[key] = p?.enum?.[0] || (key.includes("address") ? "0x…" : key === "query" ? "NVDA" : p?.description || "…");
  }
  return JSON.stringify({ tool: t.name, arguments: args }, null, 2);
}

function whenToUse(name: string) {
  if (/wallet|pnl|track/.test(name)) return "Wallet research, mark-to-market, explorer flow.";
  if (/pons|launch|curve/.test(name)) return "Indexing or preparing a pons launch (unsigned tx).";
  if (/chart|ohlc/.test(name)) return "Candles for a Robinhood Chain pool.";
  if (/desk|trend|market|boosted/.test(name)) return "Market snapshot and trending pools.";
  if (/scan|search|verify|safety|stock/.test(name)) return "Token research and ticker collision checks.";
  if (/holder|activity|analytic|trader|smart/.test(name)) return "Flow, holders (proxy), and trade prints.";
  if (/mcp|catalog|status/.test(name)) return "Connecting hosts and paging the 3000-op catalog.";
  return "Live Robinhood Chain intel via Apogee MCP.";
}

export function ToolsIndex() {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return TOOLS;
    return TOOLS.filter((t) => t.name.includes(s) || t.description.toLowerCase().includes(s));
  }, [q]);
  const grouped = GROUPS.map((g) => ({ ...g, tools: [] as ToolDef[] }));
  const used = new Set<string>();
  for (const t of filtered) {
    const g = grouped.find((x) => x.match(t));
    if (g) {
      g.tools.push(t);
      used.add(t.name);
    }
  }
  const rest = filtered.filter((t) => !used.has(t.name));

  return (
    <div className="space-y-6">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter tools" className="field w-full" />
      <p className="text-sm text-ivory/75">
        {filtered.length} listed MCP tools. Catalog aliases (scan_NVDA, volume_1h, …) live behind search_catalog / run_tool.
      </p>
      {[
        ...grouped.filter((g) => g.tools.length).map((g) => ({ id: g.id, title: g.title, tools: g.tools })),
        ...(rest.length ? [{ id: "other", title: "Other", tools: rest }] : []),
      ].map((g) => (
        <section key={g.id} className="space-y-3">
          <h2 className="font-heading text-xl text-ivory">{g.title}</h2>
          <ol className="space-y-3">
            {g.tools.map((t) => (
              <li key={t.name} className="panel rounded-xl p-5">
                <p className="font-mono text-sm text-ember">{t.name}</p>
                <p className="mt-2 text-sm text-ivory/80">{t.description}</p>
                <dl className="mt-3 space-y-2 text-xs leading-relaxed text-ivory/75">
                  <div>
                    <dt className="kicker">When to use</dt>
                    <dd className="mt-1">{whenToUse(t.name)}</dd>
                  </div>
                  <div>
                    <dt className="kicker">How it works</dt>
                    <dd className="mt-1">Dispatches through Apogee MCP to public RPC, DexScreener, GeckoTerminal, RHJ, or on-chain pons — same engine as /api/v1.</dd>
                  </div>
                </dl>
                <details className="mt-3">
                  <summary className="cursor-pointer text-xs uppercase tracking-[0.16em] text-ivory/70">Inputs & example</summary>
                  <pre className="mt-2 overflow-x-auto font-mono text-[11px] text-ivory/65">{exampleRequest(t)}</pre>
                  <pre className="mt-2 overflow-x-auto font-mono text-[11px] text-ivory/55">{JSON.stringify(t.inputSchema, null, 2)}</pre>
                  <p className="mt-2 text-[11px] text-ivory/65">Output is live JSON from the tool. Sample payloads are not fabricated.</p>
                </details>
              </li>
            ))}
          </ol>
        </section>
      ))}
      {!filtered.length ? <p className="text-sm text-ivory/70">No tools match that filter.</p> : null}
    </div>
  );
}
