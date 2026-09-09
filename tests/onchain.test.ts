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
});
