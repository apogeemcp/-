"use client";

import { useEffect, useState } from "react";
import { CodeBlock } from "./CodeBlock";

type Probe = { name: string; ok: boolean | null; detail: string; raw: string };

async function probe(name: string, url: string, init?: RequestInit): Promise<Probe> {
  try {
    const res = await fetch(url, { cache: "no-store", ...init });
    const text = await res.text();
    let ok = res.ok;
    try {
      const json = JSON.parse(text) as { ok?: boolean; error?: unknown };
      if (typeof json.ok === "boolean") ok = json.ok;
    } catch {
      /* keep HTTP ok */
    }
    return { name, ok, detail: `${res.status} ${res.statusText}`, raw: text.slice(0, 2400) };
  } catch (error) {
    return { name, ok: false, detail: error instanceof Error ? error.message : String(error), raw: "" };
  }
}

export function StatusBoard() {
  const [rows, setRows] = useState<Probe[]>([
    { name: "MCP discovery GET /api/mcp", ok: null, detail: "Checking…", raw: "" },
    { name: "Chain health GET /api/health", ok: null, detail: "Checking…", raw: "" },
    { name: "Tool apogee_status GET /api/v1/apogee_status", ok: null, detail: "Checking…", raw: "" },
  ]);

  useEffect(() => {
    void (async () => {
      const next = await Promise.all([
        probe("MCP discovery GET /api/mcp", "/api/mcp"),
        probe("Chain health GET /api/health", "/api/health"),
        probe("Tool apogee_status GET /api/v1/apogee_status", "/api/v1/apogee_status"),
      ]);
      setRows(next);
    })();
  }, []);

  return (
    <div className="space-y-4">
      <p className="text-sm text-ivory/75">
        Live probes against this origin. States are not hard-coded as operational.
      </p>
      {rows.map((r) => (
        <div key={r.name} className="panel rounded-xl p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${
                r.ok == null ? "bg-ivory/30" : r.ok ? "bg-emerald-400" : "bg-flare"
              }`}
            />
            <p className="font-heading text-ivory">{r.name}</p>
            <p className="font-mono text-[11px] text-ivory/55">{r.detail}</p>
          </div>
          {r.raw ? <div className="mt-3"><CodeBlock language="json" label="Response" code={r.raw} /></div> : null}
        </div>
      ))}
    </div>
  );
}
