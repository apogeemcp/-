import { supabaseAnonKey, supabaseUrl } from "./site";

export function logUsage(tool: string, query: string | undefined, ok: boolean) {
  const url = supabaseUrl();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey();
  if (!url || !key) return;
  void fetch(`${url}/rest/v1/apogee_usage`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ tool, query: query ? query.slice(0, 200) : null, ok }),
  }).catch(() => {});
}

export async function usageSummary() {
  const url = supabaseUrl();
  const key = supabaseAnonKey();
  if (!url || !key) return { ok: false, error: "Supabase is not configured.", rows: [] as UsageRow[] };
  const rpc = await fetch(`${url}/rest/v1/rpc/apogee_usage_summary`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  if (rpc.ok) {
    const rows = (await rpc.json()) as UsageRow[];
    return { ok: true, source: "rpc", rows: Array.isArray(rows) ? rows : [] };
  }
  const rest = await fetch(`${url}/rest/v1/apogee_usage?select=tool,created_at&order=created_at.desc&limit=200`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!rest.ok) {
    return {
      ok: false,
      error: "Usage telemetry is write-only without a public summary policy.",
      rows: [] as UsageRow[],
    };
  }
  const raw = (await rest.json()) as Array<{ tool?: string; created_at?: string }>;
  const map = new Map<string, UsageRow>();
  for (const row of raw) {
    const tool = row.tool || "unknown";
    const cur = map.get(tool) || { tool, calls: 0, last_seen: row.created_at || null };
    cur.calls += 1;
    cur.last_seen = row.created_at || cur.last_seen;
    map.set(tool, cur);
  }
  return { ok: true, source: "rest-sample", rows: [...map.values()].sort((a, b) => b.calls - a.calls) };
}

export type UsageRow = { tool: string; calls: number; last_seen: string | null };
