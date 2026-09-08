"use client";

import { useMemo, useState } from "react";
import { HOSTS, installLinks, PRODUCT } from "@/lib/site";

function CopyBlock({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] uppercase tracking-[0.2em] text-ivory/40">{label}</p>
        <button
          type="button"
          className="text-[11px] text-gold hover:text-ivory"
          onClick={async () => {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1400);
          }}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto rounded-xl border border-white/8 bg-black/50 p-4 font-mono text-[11px] leading-relaxed text-ivory/80">
        {value}
      </pre>
    </div>
  );
}

const BUTTONS = [
  { id: "cursor", label: "Cursor", hrefKey: "cursor" as const, extra: "One-click deeplink" },
  { id: "claude", label: "Claude", hrefKey: "claude" as const, extra: "Connectors → custom" },
  { id: "chatgpt", label: "ChatGPT", hrefKey: "chatgpt" as const, extra: "Developer Mode" },
  { id: "grok", label: "Grok", hrefKey: "grok" as const, extra: "Manage connectors" },
];

export function ConnectPanel() {
  const links = useMemo(() => installLinks(), []);
  const [copied, setCopied] = useState(false);

  return (
    <section className="panel rounded-xl p-6 sm:p-8">
      <p className="kicker">
        Live MCP · no API key · {PRODUCT.toolCount} ops
      </p>
      <h2 className="mt-2 font-display text-3xl text-ivory">Add Apogee to an agent</h2>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ivory/65">
        Streamable HTTP. Paste once — search, charts, wallet tracking, analytics, and pons launch prep.
      </p>
      <div className="mt-6 rounded-xl border border-white/10 bg-black/40 p-4">
        <p className="text-[10px] uppercase tracking-[0.2em] text-ivory/35">Endpoint</p>
        <p className="mt-2 break-all font-mono text-sm text-ivory">{links.url}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-gold"
            onClick={async () => {
              await navigator.clipboard.writeText(links.url);
              setCopied(true);
              setTimeout(() => setCopied(false), 1400);
            }}
          >
            {copied ? "Copied" : "Copy URL"}
          </button>
          <a href={links.alias} className="btn-ghost">
            /mcp alias
          </a>
        </div>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {BUTTONS.map((b) => (
          <a
            key={b.id}
            href={links[b.hrefKey]}
            className="rounded-xl border border-white/10 bg-black/30 px-4 py-4 hover:border-gold/40"
          >
            <p className="font-display text-xl text-ivory">{b.label}</p>
            <p className="mt-1 text-[11px] text-ivory/40">{b.extra}</p>
          </a>
        ))}
      </div>
      <p className="mt-4 text-[11px] text-ivory/40">
        Claude / ChatGPT / Grok: paste <span className="font-mono text-gold">{links.url}</span> with auth none. Cursor
        uses the deeplink.
      </p>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <CopyBlock label="JSON" value={links.json} />
        <CopyBlock label="Codex TOML" value={links.toml} />
      </div>
      <div className="mt-6">
        <CopyBlock label="Claude Code" value={links.claudeCode} />
      </div>
      <ul className="mt-6 grid gap-2 sm:grid-cols-2">
        {HOSTS.map((h) => (
          <li key={h.id} className="rounded-xl border border-white/5 px-4 py-3">
            <p className="text-sm text-ivory">{h.name}</p>
            <p className="font-mono text-[11px] text-ivory/40">{h.file}</p>
            <p className="mt-1 text-[11px] text-ivory/40">{h.hint}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
