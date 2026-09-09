import { describe, expect, it } from "vitest";
import { SEAL_BURN_USD, SEAL_PREFIX, tokenBuyUsd } from "../src/lib/onchain-config";
import { BURNABLE_TOKENS, resolveBurnableToken } from "../src/lib/onchain-tokens";
import { buildSealMemo, decodeSealImage, parseSealMemo, sanitizeSealNote } from "../src/lib/onchain-seal";
import { assembleSealsFromChain } from "../src/lib/onchain-seal-index";
import { TOOLS } from "../src/lib/tools";

const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

describe("token seals", () => {
  it("lists $ORBITX and $ROKHA at a $0.25 burn cap", () => {
    expect(SEAL_BURN_USD).toBe(0.25);
    expect(BURNABLE_TOKENS.map((t) => t.mint)).toEqual([
      "13H4WJvGEg4xrrBwWn2vsQgz7xhmhxgNdw19i1QsxPX9",
      "2jbdBWTK2MYpuRsmEDJqETU3UMM2nN3WGtete4HUpump",
    ]);
    expect(resolveBurnableToken("$ROKHA")?.id).toBe("rokha");
    expect(resolveBurnableToken("orbitx")?.symbol).toBe("$ORBITX");
    expect(tokenBuyUsd(0, 0.25, 0.05)).toBe(0.3);
    expect(tokenBuyUsd(0.05, 0.25, 0.05)).toBe(0.25);
  });

  it("round-trips a seal memo and rejects empty notes", () => {
    expect(sanitizeSealNote("").ok).toBe(false);
    const memo = buildSealMemo({
      tokenMint: "13H4WJvGEg4xrrBwWn2vsQgz7xhmhxgNdw19i1QsxPX9",
      imageId: "abc123",
      nftMint: "NftMint11111111111111111111111111111111111",
      sha256: "ab".repeat(32),
      note: "hello:forever",
    });
    expect(memo.startsWith(SEAL_PREFIX)).toBe(true);
    const parsed = parseSealMemo(memo);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.seal.note).toBe("hello:forever");
      expect(parsed.token.symbol).toBe("$ORBITX");
      expect(parsed.seal.imageId).toBe("abc123");
    }
  });

  it("accepts a tiny PNG and assembles seals from chain txs", () => {
    const decoded = decodeSealImage({ imageBase64: TINY_PNG.toString("base64"), imageMime: "image/png" });
    expect(decoded.ok).toBe(true);
    const memo = buildSealMemo({
      tokenMint: "2jbdBWTK2MYpuRsmEDJqETU3UMM2nN3WGtete4HUpump",
      imageId: "imgid",
      nftMint: "",
      sha256: decoded.ok ? decoded.image.sha256 : "",
      note: "rokha seal",
    });
    const out = assembleSealsFromChain([
      {
        signature: "burn",
        slot: 3,
        blockTime: "2026-09-09T12:00:03.000Z",
        memo: null,
        orbitxDelta: 0,
        mintDeltas: { "2jbdBWTK2MYpuRsmEDJqETU3UMM2nN3WGtete4HUpump": -10 },
        solDelta: 0,
      },
      {
        signature: "buy",
        slot: 2,
        blockTime: "2026-09-09T12:00:02.000Z",
        memo: null,
        orbitxDelta: 0,
        mintDeltas: { "2jbdBWTK2MYpuRsmEDJqETU3UMM2nN3WGtete4HUpump": 12 },
        solDelta: -0.002,
      },
      {
        signature: "memo",
        slot: 1,
        blockTime: "2026-09-09T12:00:01.000Z",
        memo,
        orbitxDelta: 0,
        mintDeltas: {},
        solDelta: 0,
      },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].tokenSymbol).toBe("$ROKHA");
    expect(out[0].buyTx).toBe("buy");
    expect(out[0].burnTx).toBe("burn");
    expect(out[0].note).toBe("rokha seal");
  });

  it("registers seal MCP tools", () => {
    const names = TOOLS.map((t) => t.name);
    expect(names).toContain("write_token_seal");
    expect(names).toContain("list_token_seals");
    expect(names).toContain("list_burn_tokens");
  });
});
