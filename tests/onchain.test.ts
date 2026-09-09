import { describe, expect, it } from "vitest";
import {
  EVENT_TYPES,
  MEMO_PREFIX,
  NOTE_BURN_USD,
  NOTE_MAX_CHARS,
  ORBITX_MINT,
  SERVICE_WALLET_PUBLIC,
} from "../src/lib/onchain-config";
import { buildMemoText, parseMemoText, sanitizeNote, isIdempotencyKey, previewNote } from "../src/lib/onchain-memo";
import { toolSafety } from "../src/lib/docs";
import { TOOLS } from "../src/lib/tools";
import { asRowArray } from "../src/lib/supabase-admin";
import { assembleFromChain } from "../src/lib/onchain-chain-index";

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
    expect(NOTE_BURN_USD).toBe(0.02);
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
  });

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
    expect(out.stats.totalMemos).toBe(1);
  });
});
