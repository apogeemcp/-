import { Pool, type PoolConfig } from "pg";

const URL_KEYS = [
  "POSTGRES_URL_NON_POOLING",
  "DATABASE_URL",
  "POSTGRES_URL",
  "POSTGRES_PRISMA_URL",
  "SUPABASE_DB_URL",
] as const;

/** Direct Postgres URL only. Never a Supabase JWT / sb_secret_ key. */
export function postgresUrlFromEnv(env: NodeJS.Dict<string> = process.env): string | null {
  for (const key of URL_KEYS) {
    const value = env[key]?.trim();
    if (!value) continue;
    if (/^postgres(ql)?:\/\//i.test(value)) return value;
  }
  return null;
}

export function sqlConfigured(env: NodeJS.Dict<string> = process.env): boolean {
  return Boolean(postgresUrlFromEnv(env));
}

function sslFor(url: string): PoolConfig["ssl"] {
  if (/sslmode=disable/i.test(url)) return false;
  try {
    const host = new URL(url).hostname;
    if (host === "localhost" || host === "127.0.0.1") return false;
  } catch {
    /* keep TLS on for unparsable remote URLs */
  }
  return { rejectUnauthorized: false };
}

let pool: Pool | null = null;

export function getPgPool(): Pool | null {
  if (pool) return pool;
  const connectionString = postgresUrlFromEnv();
  if (!connectionString) return null;
  pool = new Pool({
    connectionString,
    max: 1,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 8_000,
    ssl: sslFor(connectionString),
  });
  pool.on("error", () => {
    /* idle disconnects are expected on serverless */
  });
  return pool;
}

export async function pgQuery<T extends Record<string, unknown> = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<{ ok: true; rows: T[] } | { ok: false; error: string }> {
  const client = getPgPool();
  if (!client) return { ok: false, error: "Postgres is not configured." };
  try {
    const result = await client.query(text, params);
    return { ok: true, rows: result.rows as T[] };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
