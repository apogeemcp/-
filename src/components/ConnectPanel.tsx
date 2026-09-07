"use client";

import { useMemo, useState } from "react";
import { HOSTS, cursorConfig, cursorRemoteSupabase, mcpHttpUrl, publicSiteUrl } from "@/lib/site";

function CopyBlock({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] uppercase tracking-[0.22em] text-gold">{label}</p>
        <button
          type="button"
          className="rounded-full border border-gold/30 px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-ivory/80 hover:bg-gold hover:text-void"
          onClick={async () => {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1400);
          }}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto rounded-2xl border border-white/5 bg-black/50 p-4 font-mono text-[11px] leading-relaxed text-ivory/85">
        {value}
      </pre>
    </div>
  );
}

export function ConnectPanel() {
  const site = publicSiteUrl();
  const http = `${site}/api/mcp`;
  const supabase = mcpHttpUrl();
  const cursor = useMemo(() => JSON.stringify(cursorConfig(), null, 2), []);
  const remote = useMemo(() => JSON.stringify(cursorRemoteSupabase(), null, 2), []);
  const toml = `[mcp_servers.apogee]\nurl = "${http}"`;

  return (
    <section className="glass rounded-3xl p-6 sm:p-8">
      <p className="text-[10px] uppercase tracking-[0.3em] text-ember">No login · no API key · add and use</p>
      <h2 className="mt-2 font-display text-3xl text-ivory">Drop Apogee into any AI app</h2>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ivory/70">
        Apogee speaks Streamable HTTP MCP. Paste the URL into Cursor, Claude, ChatGPT, Windsurf, Gemini, Codex, or
        VS Code. Every tool is read-only Robinhood Chain intel — Search, Chart, Desk, Launch.
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-gold/20 bg-black/30 p-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-gold">Website MCP</p>
          <p className="mt-2 break-all font-mono text-xs text-ivory">{http}</p>
        </div>
        <div className="rounded-2xl border border-flare/30 bg-black/30 p-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-ember">Supabase MCP</p>
          <p className="mt-2 break-all font-mono text-xs text-ivory">{supabase}</p>
        </div>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <CopyBlock label="Cursor / Claude / VS Code JSON" value={cursor} />
        <CopyBlock label="Hosted Supabase MCP" value={remote} />
      </div>
      <div className="mt-6">
        <CopyBlock label="Codex CLI TOML" value={toml} />
      </div>
      <ul className="mt-6 grid gap-2 sm:grid-cols-2">
        {HOSTS.map((h) => (
          <li key={h.id} className="rounded-xl border border-white/5 px-4 py-3">
            <p className="text-sm text-ivory">{h.name}</p>
            <p className="font-mono text-[11px] text-ivory/50">{h.file}</p>
            <p className="mt-1 text-[11px] text-ivory/45">{h.hint}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
