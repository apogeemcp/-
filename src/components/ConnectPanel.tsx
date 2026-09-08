"use client";

import { useMemo, useState } from "react";
import { HOSTS, installLinks, PRODUCT } from "@/lib/site";

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

const BUTTONS = [
  { id: "cursor", label: "Add to Cursor", hrefKey: "cursor" as const, extra: "cursor://" },
  { id: "claude", label: "Add to Claude", hrefKey: "claude" as const, extra: "Paste the MCP URL" },
  { id: "chatgpt", label: "Add to ChatGPT", hrefKey: "chatgpt" as const, extra: "Developer Mode → connector" },
  { id: "grok", label: "Add to Grok", hrefKey: "grok" as const, extra: "Connectors → custom" },
];

export function ConnectPanel() {
  const links = useMemo(() => installLinks(), []);
  const [copied, setCopied] = useState(false);

  return (
    <section className="glass rounded-3xl p-6 sm:p-8">
      <p className="text-[10px] uppercase tracking-[0.3em] text-ember">Live MCP · no API key · {PRODUCT.toolCount} ops</p>
      <h2 className="mt-2 font-display text-3xl text-ivory">One-click add to Grok, Claude, GPT, Cursor</h2>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ivory/70">
        Canonical Streamable HTTP endpoint. Paste once — every connected agent inherits Robinhood Chain search, charts,
        wallet tracking, analytics, and pons launch prep.
      </p>
      <div className="mt-6 rounded-2xl border border-gold/30 bg-black/40 p-4">
        <p className="text-[10px] uppercase tracking-[0.2em] text-gold">MCP URL</p>
        <p className="mt-2 break-all font-mono text-sm text-ivory">{links.url}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-full bg-gold px-4 py-2 text-[11px] uppercase tracking-[0.16em] text-void"
            onClick={async () => {
              await navigator.clipboard.writeText(links.url);
              setCopied(true);
              setTimeout(() => setCopied(false), 1400);
            }}
          >
            {copied ? "Copied" : "Copy MCP URL"}
          </button>
          <a
            href={links.alias}
            className="rounded-full border border-ivory/20 px-4 py-2 text-[11px] uppercase tracking-[0.16em] text-ivory"
          >
            /mcp alias
          </a>
        </div>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {BUTTONS.map((b) => (
          <a
            key={b.id}
            href={links[b.hrefKey]}
            className="rounded-2xl border border-gold/25 bg-black/35 px-4 py-4 text-center hover:border-gold"
          >
            <p className="font-display text-lg text-gold">{b.label}</p>
            <p className="mt-1 text-[11px] text-ivory/50">{b.extra}</p>
          </a>
        ))}
      </div>
      <p className="mt-4 text-[11px] text-ivory/45">
        Claude / ChatGPT / Grok open their connector settings — paste <span className="font-mono text-gold">{links.url}</span>{" "}
        with auth set to none. Cursor uses a native install deeplink.
      </p>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <CopyBlock label="Cursor / Claude / VS Code JSON" value={links.json} />
        <CopyBlock label="Codex CLI TOML" value={links.toml} />
      </div>
      <div className="mt-6">
        <CopyBlock label="Claude Code" value={links.claudeCode} />
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
