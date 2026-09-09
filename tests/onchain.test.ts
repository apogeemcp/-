import { describe, expect, it } from "vitest";
import {
  EVENT_TYPES,
  MEMO_PREFIX,
  MEMO_PROGRAM_ID,
  NOTE_BURN_USD,
  NOTE_MAX_CHARS,
  ORBITX_MINT,
  ORBITX_RESERVE_USD,
  SERVICE_WALLET_PUBLIC,
  orbitxBurnUi,
  orbitxBuyUsd,
} from "../src/lib/onchain-config";
import {
  buildMemoText,
  parseMemoText,
  sanitizeNote,
  isIdempotencyKey,
  previewNote,
  extractMemoFromParsedParts,
  extractMemoFromLogs,
} from "../src/lib/onchain-memo";
import { toolSafety } from "../src/lib/docs";
import { TOOLS } from "../src/lib/tools";
import { asRowArray } from "../src/lib/supabase-admin";
import { assembleFromChain, mergeAssembled, preferAssembledScan } from "../src/lib/onchain-chain-index";
import { postgresUrlFromEnv } from "../src/lib/pg-pool";
import { activityFromSqlRow, publicNoteFromSqlRow } from "../src/lib/onchain-sql";
import { plainTextError, readResponseJson } from "../src/lib/read-json";

describe("on-chain notes", () => {
  it("validates and prefixes memos", () => {
    expect(sanitizeNote("").ok).toBe(false);
    expect(sanitizeNote("   ").ok).toBe(false);
    expect(sanitizeNote("x".repeat(NOTE_MAX_CHARS + 1)).ok).toBe(false);
    const ok = sanitizeNote("  Building the future of AI-powered trading.  ");
    expect(ok.ok).toBe(true);
    if (!ok.ok) return;
    expect(buildMemoText(ok.note)).toBe(`${MEMO_PREFIX}Building the future of AI-powered trading.`);
    expect(parseMemoText(buildMemoText(ok.note))).toEqual({ ok: true, note: ok.note });
    expect(parseMemoText("nope").ok).toBe(false);
  });

  it("strips control characters and keeps UTF-8", () => {
    const ok = sanitizeNote("hello\u0000world");
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.note).toBe("helloworld");
  });

  it("requires idempotency keys to be boring tokens", () => {
    expect(isIdempotencyKey("note-2026-09-09-aaaa")).toBe(true);
    expect(isIdempotencyKey("bad key")).toBe(false);
    expect(isIdempotencyKey("x")).toBe(false);
  });

  it("truncates feed previews without losing the prefix test", () => {
    const long = "a".repeat(200);
    expect(previewNote(long, 40).endsWith("…")).toBe(true);
    expect(previewNote("short", 40)).toBe("short");
  });

  it("sizes burns in USD, not a hardcoded token count", () => {
    expect(NOTE_BURN_USD).toBe(0.03);
    expect(ORBITX_RESERVE_USD).toBe(0.15);
    expect(orbitxBuyUsd(0)).toBe(0.18);
    expect(orbitxBuyUsd(0.15)).toBe(0.03);
    expect(orbitxBuyUsd(0.1)).toBe(0.08);
    expect(orbitxBuyUsd(0.2)).toBe(0.03);
    expect(orbitxBurnUi(0, 0.001)).toBe(0);
    expect(orbitxBurnUi(180, 0.001)).toBe(30);
    expect(orbitxBurnUi(150, 0.001)).toBe(0);
    expect(orbitxBurnUi(160, 0.001)).toBe(10);
    expect(ORBITX_MINT).toBe("13H4WJvGEg4xrrBwWn2vsQgz7xhmhxgNdw19i1QsxPX9");
    expect(SERVICE_WALLET_PUBLIC).toMatch(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/);
  });

  it("publishes explicit event types and MCP tools", () => {
    expect(EVENT_TYPES).toEqual([
      "MEMO_CREATED",
      "ORBITX_PURCHASE",
      "ORBITX_BURN",
      "TRANSACTION_CONFIRMED",
      "TRANSACTION_FAILED",
    ]);
    const names = TOOLS.map((t) => t.name);
    for (const name of [
      "write_onchain_note",
      "get_onchain_note",
      "list_onchain_notes",
      "get_onchain_activity",
      "get_service_wallet_status",
      "burn_orbitx",
    ]) {
      expect(names).toContain(name);
    }
    expect(toolSafety("write_onchain_note").class).toBe("FINANCIAL / HIGH IMPACT");
    expect(toolSafety("burn_orbitx").class).toBe("FINANCIAL / HIGH IMPACT");
    const walletTool = TOOLS.find((t) => t.name === "get_service_wallet_status");
    expect(walletTool?.inputSchema).toEqual({ type: "object", properties: {} });
    expect(walletTool?.description).toMatch(/Never returns private keys/);
  });

  it("serves the public feed from chain scans", async () => {
    const { publicFeed } = await import("../src/lib/onchain-service");
    const feed = await publicFeed({ type: "ALL", limit: 5 });
    expect(feed.ok).toBe(true);
    expect(Array.isArray(feed.items)).toBe(true);
  }, 30_000);

  it("does not treat API error objects as row lists", () => {
    expect(asRowArray(null)).toEqual([]);
    expect(asRowArray(undefined)).toEqual([]);
    expect(asRowArray({ hint: "Use a JWT", message: "Invalid API key" })).toEqual([]);
    expect(asRowArray([{ usd_value: 0.02, sol_spent: 0.0001 }])).toEqual([{ usd_value: 0.02, sol_spent: 0.0001 }]);
  });

  it("assembles notes and the public feed from confirmed chain transactions", () => {
    const memo = "ORBITX_NOTE:v1:hello chain";
    const out = assembleFromChain([
      { signature: "burnsig", slot: 3, blockTime: "2026-09-09T10:00:03.000Z", memo: null, orbitxDelta: -123.4, solDelta: 0 },
      { signature: "buysig", slot: 2, blockTime: "2026-09-09T10:00:02.000Z", memo: null, orbitxDelta: 123.4, solDelta: -0.0002 },
      { signature: "memosig", slot: 1, blockTime: "2026-09-09T10:00:01.000Z", memo, orbitxDelta: 0, solDelta: 0 },
    ]);
    expect(out.notes).toHaveLength(1);
    expect(out.notes[0].id).toBe("memosig");
    expect(out.notes[0].note).toBe("hello chain");
    expect(out.notes[0].buyTx).toBe("buysig");
    expect(out.notes[0].burnTx).toBe("burnsig");
    expect(out.notes[0].memoStatus).toBe("confirmed");
    expect(out.notes[0].buyStatus).toBe("confirmed");
    expect(out.notes[0].burnStatus).toBe("confirmed");
    expect(out.activity.map((a) => a.event_type)).toEqual(["ORBITX_BURN", "ORBITX_PURCHASE", "MEMO_CREATED"]);
    expect(out.activity.find((a) => a.event_type === "MEMO_CREATED")?.memo).toBe(memo);
    expect(out.stats.totalMemos).toBe(1);
  });

  it("does not treat memo program invoke logs as the note body", () => {
    const note = "Apogee chain-source smoke — notes live on Solana.";
    const memo = `${MEMO_PREFIX}${note}`;
    const logs = [
      `Program ${MEMO_PROGRAM_ID} invoke [1]`,
      `Program log: Memo (len ${memo.length}): "${memo}"`,
      `Program ${MEMO_PROGRAM_ID} success`,
    ];
    expect(extractMemoFromLogs(logs)).toBe(memo);
    expect(extractMemoFromParsedParts({ logs })).toBe(memo);
    expect(extractMemoFromParsedParts({
      instructions: [{ programId: MEMO_PROGRAM_ID, parsed: memo }],
      logs,
    })).toBe(memo);
    expect(parseMemoText(extractMemoFromLogs(logs) || "").ok).toBe(true);

    const out = assembleFromChain([
      { signature: "memosig", slot: 1, blockTime: "2026-09-09T10:09:14.000Z", memo: extractMemoFromLogs(logs), orbitxDelta: 0, solDelta: 0 },
    ]);
    expect(out.notes).toHaveLength(1);
    expect(out.notes[0].note).toBe(note);
  });

  it("keeps the last good chain scan when RPC returns nothing", () => {
    const good = assembleFromChain([
      { signature: "memosig", slot: 1, blockTime: "2026-09-09T10:09:14.000Z", memo: "ORBITX_NOTE:v1:keep me", orbitxDelta: 0, solDelta: 0 },
    ]);
    const empty = assembleFromChain([]);
    expect(preferAssembledScan(good, empty, { requested: 8, fetched: 0 })).toBe(good);
    expect(preferAssembledScan(good, empty, { requested: 8, fetched: 2 }).notes).toHaveLength(1);
    expect(preferAssembledScan(null, empty, { requested: 0, fetched: 0 }).notes).toHaveLength(0);
    const newer = assembleFromChain([
      { signature: "newsig", slot: 2, blockTime: "2026-09-09T10:10:00.000Z", memo: "ORBITX_NOTE:v1:fresh", orbitxDelta: 0, solDelta: 0 },
    ]);
    expect(preferAssembledScan(good, newer, { requested: 2, fetched: 2 }).notes[0].note).toBe("fresh");
  });

  it("picks a Postgres URL and ignores JWTs", () => {
    expect(postgresUrlFromEnv({ SUPABASE_SERVICE_ROLE_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.x" })).toBeNull();
    expect(postgresUrlFromEnv({ DATABASE_URL: "postgres://user:pass@localhost:5432/apogee" })).toBe(
      "postgres://user:pass@localhost:5432/apogee",
    );
    expect(
      postgresUrlFromEnv({
        POSTGRES_URL: "postgresql://pooler",
        POSTGRES_URL_NON_POOLING: "postgres://direct",
      }),
    ).toBe("postgres://direct");
  });

  it("maps SQL rows to public notes without using JWT fields", () => {
    const note = publicNoteFromSqlRow({
      memo_tx: "memosig",
      note: "hello sql",
      memo_text: "ORBITX_NOTE:v1:hello sql",
      source: "chain",
      wallet: SERVICE_WALLET_PUBLIC,
      memo_status: "confirmed",
      buy_status: "confirmed",
      burn_status: "confirmed",
      buy_tx: "buysig",
      burn_tx: "burnsig",
      token_amount: "123.4",
      usd_value: "0.02",
      sol_spent: "0.0002",
      price_usd: "0.00001",
      created_at: "2026-09-09T10:00:01.000Z",
      memo_confirmed_at: "2026-09-09T10:00:01.000Z",
      buy_confirmed_at: "2026-09-09T10:00:02.000Z",
      burn_confirmed_at: "2026-09-09T10:00:03.000Z",
      error: null,
    });
    expect(note?.id).toBe("memosig");
    expect(note?.note).toBe("hello sql");
    expect(note?.tokenAmount).toBe(123.4);
    expect(note?.usdValue).toBe(0.02);
    expect(note?.priceUsd).toBe(0.00001);
    expect(note?.buyTx).toBe("buysig");
    const event = activityFromSqlRow({
      event_type: "MEMO_CREATED",
      transaction_signature: "memosig",
      message: "New on-chain memo recorded",
      memo: "ORBITX_NOTE:v1:hello sql",
      status: "confirmed",
      created_at: "2026-09-09T10:00:01.000Z",
      usd_value: null,
      token_amount: null,
    });
    expect(event.id).toBe("MEMO_CREATED:memosig");
    expect(event.memo).toBe("ORBITX_NOTE:v1:hello sql");
  });

  it("merges a SQL index with a later chain scan instead of dropping memos", () => {
    const sql = assembleFromChain([
      { signature: "memosig", slot: 1, blockTime: "2026-09-09T10:00:01.000Z", memo: "ORBITX_NOTE:v1:keep me", orbitxDelta: 0, solDelta: 0 },
    ]);
    const chain = assembleFromChain([
      { signature: "burnsig", slot: 3, blockTime: "2026-09-09T10:00:03.000Z", memo: null, orbitxDelta: -10, solDelta: 0 },
      { signature: "buysig", slot: 2, blockTime: "2026-09-09T10:00:02.000Z", memo: null, orbitxDelta: 10, solDelta: -0.0001 },
      { signature: "memosig", slot: 1, blockTime: "2026-09-09T10:00:01.000Z", memo: "ORBITX_NOTE:v1:keep me", orbitxDelta: 0, solDelta: 0 },
    ]);
    const merged = mergeAssembled(sql, chain);
    expect(merged.notes[0].note).toBe("keep me");
    expect(merged.notes[0].buyTx).toBe("buysig");
    expect(merged.notes[0].burnTx).toBe("burnsig");
    expect(merged.stats.totalMemos).toBe(1);
  });

  it("turns Vercel timeout text into a usable error instead of a JSON parse crash", async () => {
    expect(plainTextError("An error occurred with your application.", 500)).toMatch(/timed out/i);
    const res = new Response("An error occurred with your application.", {
      status: 504,
      headers: { "content-type": "text/plain" },
    });
    await expect(readResponseJson(res)).rejects.toThrow(/timed out/i);
  });
});
