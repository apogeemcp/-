import { supabaseUrl } from "./site";

export function supabaseAdmin(): { url: string; key: string } | null {
  const url = supabaseUrl();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return { url, key };
}

export async function sbRest<T>(
  path: string,
  init: RequestInit & { method?: string } = {},
): Promise<{ ok: boolean; status: number; data: T | null; error?: string }> {
  const admin = supabaseAdmin();
  if (!admin) return { ok: false, status: 503, data: null, error: "Supabase service role is not configured." };
  const res = await fetch(`${admin.url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: admin.key,
      Authorization: `Bearer ${admin.key}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let data: T | null = null;
  if (text) {
    try {
      data = JSON.parse(text) as T;
    } catch {
      data = null;
    }
  }
  if (!res.ok) {
    // Never return the error JSON as `data` — callers treat it as a row list.
    return { ok: false, status: res.status, data: null, error: text.slice(0, 400) || `HTTP ${res.status}` };
  }
  return { ok: true, status: res.status, data };
}

export function asRowArray<T>(data: unknown): T[] {
  return Array.isArray(data) ? (data as T[]) : [];
}

export async function sbInsert<T extends Record<string, unknown>>(table: string, row: T) {
  return sbRest(`${table}`, { method: "POST", body: JSON.stringify(row), headers: { Prefer: "return=representation" } });
}

export async function auditEvent(kind: string, payload: Record<string, unknown>) {
  const admin = supabaseAdmin();
  if (!admin) return;
  await sbInsert("apogee_audit_events", {
    kind,
    payload,
  }).catch(() => {});
}
