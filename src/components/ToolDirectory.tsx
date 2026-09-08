"use client";

import { useMemo, useState } from "react";
import { CodeBlock } from "./CodeBlock";
import { listedToolDocs, TOOL_CATEGORIES, type ListedToolDoc, type ToolCategory } from "@/lib/docs";

function ToolCard({ t }: { t: ListedToolDoc }) {
  return (
    <article id={t.name} className="panel scroll-mt-28 rounded-xl p-5">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-mono text-sm text-ember">{t.name}</h3>
        <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-ivory/60">
          {t.category}
        </span>
        <span className="rounded-full border border-ember/30 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-ember">
          {t.safety.class}
        </span>
      </div>
      <p className="mt-2 text-sm text-ivory/80">{t.description}</p>
      <dl className="mt-4 grid gap-3 text-xs leading-relaxed text-ivory/70 sm:grid-cols-2">
        <div>
          <dt className="kicker">Required</dt>
          <dd className="mt-1 font-mono">{t.required.length ? t.required.join(", ") : "none"}</dd>
        </div>
        <div>
          <dt className="kicker">Optional</dt>
          <dd className="mt-1 font-mono">{t.optional.length ? t.optional.join(", ") : "none"}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="kicker">Safety</dt>
          <dd className="mt-1">{t.safety.note}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="kicker">Freshness</dt>
          <dd className="mt-1">{t.freshness}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="kicker">Permissions / rate limits</dt>
          <dd className="mt-1">
            {t.permissions} {t.rateLimits}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="kicker">Output</dt>
          <dd className="mt-1">{t.outputSchema}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="kicker">Errors</dt>
          <dd className="mt-1">{t.errors}</dd>
        </div>
      </dl>
      <div className="mt-4 space-y-3">
        <CodeBlock language="json" label="Example MCP request" code={JSON.stringify(t.exampleRequest, null, 2)} />
        <CodeBlock language="json" label="Input schema" code={JSON.stringify(t.inputSchema, null, 2)} />
        <p className="break-all font-mono text-[11px] text-ivory/55">REST GET {t.restExample}</p>
      </div>
    </article>
  );
}

export function ToolDirectory() {
  const all = useMemo(() => listedToolDocs(), []);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<ToolCategory | "all">("all");
  const filtered = all.filter((t) => {
    if (cat !== "all" && t.category !== cat) return false;
    const s = q.trim().toLowerCase();
    if (!s) return true;
    return `${t.name} ${t.description} ${t.safety.class}`.toLowerCase().includes(s);
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter listed tools" className="field flex-1 rounded-xl" />
        <select
          className="field rounded-xl sm:w-44"
          value={cat}
          onChange={(e) => setCat(e.target.value as ToolCategory | "all")}
        >
          <option value="all">All categories</option>
          {TOOL_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <p className="text-sm text-ivory/70">
        {filtered.length} of {all.length} listed MCP tools. Catalog aliases (scan_NVDA, volume_1h, …) are invoked with
        search_catalog and run_tool — they are not duplicated here.
      </p>
      {TOOL_CATEGORIES.map((c) => {
        const tools = filtered.filter((t) => t.category === c);
        if (!tools.length) return null;
        return (
          <section key={c} className="space-y-3">
            <h2 className="font-heading text-xl text-ivory">{c}</h2>
            {tools.map((t) => (
              <ToolCard key={t.name} t={t} />
            ))}
          </section>
        );
      })}
      {!filtered.length ? <p className="text-sm text-ivory/70">No listed tools match.</p> : null}
    </div>
  );
}
