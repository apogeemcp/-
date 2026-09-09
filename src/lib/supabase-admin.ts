import { supabaseUrl } from "./site";

export type AdminKind = "service_role" | "secret";

export type AdminClient = {
  url: string;
  key: string;
  kind: AdminKind;
};

export function normalizeServiceKey(raw: string): string {
  let key = raw.replace(/^\uFEFF/, "").trim();
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1).replace(/^\uFEFF/, "").trim();
  }
  return key.replace(/^bearer\s+/i, "").trim();
}

function firstSecretFromJson(raw: string | undefined): string | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed === "string") return parsed;
    if (parsed && typeof parsed === "object") {
      const rec = parsed as Record<string, unknown>;
      const pick = rec.default ?? rec.service_role ?? Object.values(rec)[0];
      return typeof pick === "string" ? pick : null;
    }
  } catch {
    return null;
  }
  return null;
}

export function rawAdminKey(): string | null {
  const fromEnv =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    firstSecretFromJson(process.env.SUPABASE_SECRET_KEYS);
  if (!fromEnv) return null;
  const key = normalizeServiceKey(fromEnv);
  return key || null;
}

function jwtPayload(key: string): Record<string, unknown> | null {
  const parts = key.split(".");
  if (parts.length !== 3) return null;
  try {
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const json = Buffer.from(padded, "base64").toString("utf8");
    const data = JSON.parse(json) as unknown;
    return data && typeof data === "object" ? (data as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export function inspectServiceKey(raw: string): {
  kind: "secret" | "service_role" | "anon" | "publishable" | "unknown";
  issue: string | null;
} {
  const key = normalizeServiceKey(raw);
  if (!key) return { kind: "unknown", issue: "Notes cannot be stored (missing service role)." };
  if (key.startsWith("sb_publishable_")) {
    return {
      kind: "publishable",
      issue: "Notes cannot be stored (publishable key configured; use the sb_secret_ key or legacy service_role JWT).",
    };
  }
  if (key.startsWith("sb_secret_")) return { kind: "secret", issue: null };
  const payload = jwtPayload(key);
  if (payload) {
    const role = String(payload.role || "");
    if (role === "anon" || role === "authenticated") {
      return {
        kind: "anon",
        issue: "Notes cannot be stored (anon key configured; use the service_role JWT or sb_secret_ key).",
      };
    }
    if (role === "service_role") return { kind: "service_role", issue: null };
    if (role) {
      return { kind: "unknown", issue: "Notes cannot be stored (configured JWT is not service_role)." };
    }
  }
  if (key.startsWith("eyJ")) return { kind: "service_role", issue: null };
  return { kind: "unknown", issue: "Notes cannot be stored (unrecognized service key)." };
}

export function adminKeyIssue(): string | null {
  const key = rawAdminKey();
  if (!key) return "Notes cannot be stored (missing service role).";
  return inspectServiceKey(key).issue;
}

export function supabaseAdmin(): AdminClient | null {
  const url = supabaseUrl();
  const key = rawAdminKey();
  if (!url || !key) return null;
  const inspected = inspectServiceKey(key);
  if (inspected.issue) return null;
  if (inspected.kind === "secret") return { url, key, kind: "secret" };
  if (inspected.kind === "service_role") return { url, key, kind: "service_role" };
  return null;
}

export function adminRestHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const admin = supabaseAdmin();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Prefer: "return=representation",
    "User-Agent": "apogee-mcp/2.0",
    ...extra,
  };
  if (!admin) return headers;
  headers.apikey = admin.key;
  // Opaque sb_secret_ keys are not JWTs. Sending them as Bearer makes Kong return Invalid API key.
  if (admin.kind === "service_role") headers.Authorization = `Bearer ${admin.key}`;
  return headers;
}

export async function sbRest<T>(
  path: string,
  init: RequestInit & { method?: string } = {},
): Promise<{ ok: boolean; status: number; data: T | null; error?: string }> {
  const admin = supabaseAdmin();
  if (!admin) {
    return { ok: false, status: 503, data: null, error: adminKeyIssue() || "Supabase service role is not configured." };
  }
  const extra = (init.headers || {}) as Record<string, string>;
  const res = await fetch(`${admin.url}/rest/v1/${path}`, {
    ...init,
    headers: adminRestHeaders(extra),
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

export function storeWriteError(inserted: { status: number; error?: string }): { status: number; error: string } {
  const text = inserted.error || "";
  if (/invalid api key/i.test(text)) {
    return {
      status: 503,
      error: "Notes cannot be stored (Supabase rejected the API key). Use the service_role JWT or sb_secret_ key.",
    };
  }
  if (/permission denied/i.test(text) || inserted.status === 401 || inserted.status === 403) {
    return {
      status: 503,
      error: "Notes cannot be stored (permission denied). The configured key is not allowed to write notes.",
    };
  }
  return { status: inserted.status >= 400 ? inserted.status : 502, error: "Could not create the note record." };
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
