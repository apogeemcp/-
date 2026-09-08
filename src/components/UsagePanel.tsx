"use client";

import { useEffect, useState } from "react";
import type { UsageRow } from "@/lib/usage";

export function UsagePanel() {
  const [data, setData] = useState<{ ok?: boolean; error?: string; rows?: UsageRow[]; source?: string } | null>(null);

  useEffect(() => {
    fetch("/api/usage")
      .then((r) => r.json())
      .then(setData)
      .catch((e) => setData({ ok: false, error: String(e), rows: [] }));
  }, []);

  if (!data) return <p className="text-sm text-ivory/70">Loading usage telemetry…</p>;
  if (!data.ok) {
    return (
      <p className="text-sm text-ivory/75">
        {data.error || "Usage aggregates are not publicly readable yet."} Tool calls are still logged server-side when
        Supabase service credentials are present.
      </p>
    );
  }
  if (!data.rows?.length) {
    return <p className="text-sm text-ivory/75">No usage rows yet. Numbers appear after live MCP/API traffic is logged.</p>;
  }
  return (
    <div>
      <p className="mb-3 text-xs text-ivory/65">Source: {data.source}. Counts are real telemetry, not placeholders.</p>
      <ul className="space-y-2 sm:hidden">
        {data.rows.map((row) => (
          <li key={row.tool} className="rounded-xl border border-white/10 bg-black/30 p-3">
            <p className="font-mono text-gold">{row.tool}</p>
            <p className="mt-1 text-sm text-ivory">{row.calls} calls</p>
            <p className="text-xs text-ivory/60">{row.last_seen ? new Date(row.last_seen).toLocaleString() : "—"}</p>
          </li>
        ))}
      </ul>
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[28rem] text-left text-sm">
          <thead>
            <tr className="border-b border-white/15 text-ivory/70">
              <th className="py-2 font-medium">Tool</th>
              <th className="py-2 font-medium">Calls</th>
              <th className="py-2 font-medium">Last seen</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => (
              <tr key={row.tool} className="border-b border-white/10">
                <td className="py-2 font-mono text-gold">{row.tool}</td>
                <td className="py-2 font-mono text-ivory">{row.calls}</td>
                <td className="py-2 text-ivory/80">{row.last_seen ? new Date(row.last_seen).toLocaleString() : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
