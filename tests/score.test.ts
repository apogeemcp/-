import { describe, expect, it } from "vitest";
import { computeApogeeScore, momentumScore, scoreAthMarketCap, verdictFor } from "@/lib/score";
import { isAddress } from "@/lib/chain";
import { TOOLS } from "@/lib/tools";
import { handleMcpBody } from "@/lib/mcp";

describe("scoring", () => {
  it("scores canonical stock tokens as strong", () => {
    const { score, flags } = computeApogeeScore({
      canonicalStock: true,
      collisionCount: 1,
      liquidityUsd: 6_000_000,
      mcapUsd: 15_000_000,
      ageDays: 40,
      poolAgeDays: 40,
      holderCount: 8000,
      topHoldersPct: 20,
      hasWebsite: true,
      verifiedName: true,
      premiumBps: 40,
    });
    expect(flags.canonicalStock).toBe(true);
    expect(score.total).toBeGreaterThanOrEqual(70);
    expect(score.verdict).toBe("CANONICAL STOCK TOKEN");
  });

  it("penalizes lookalike tickers with thin books", () => {
    const { score, flags } = computeApogeeScore({
      canonicalStock: false,
      collisionCount: 5,
      liquidityUsd: 200,
      mcapUsd: 4000,
      ageDays: 0,
      poolAgeDays: 0,
      holderCount: 12,
      topHoldersPct: 80,
      hasWebsite: false,
      verifiedName: false,
      premiumBps: 2500,
    });
    expect(flags.unverifiedLookalike).toBe(true);
    expect(flags.lowLiquidity).toBe(true);
    expect(score.total).toBeLessThan(45);
  });

  it("maps ATH buckets", () => {
    expect(scoreAthMarketCap(2e9)).toBe(100);
    expect(scoreAthMarketCap(50)).toBe(5);
  });

  it("labels momentum", () => {
    expect(momentumScore(80, 90, 10, 3).label).toBe("hot");
    expect(momentumScore(-40, 10, 90, 0.1).momentum).toBeLessThan(40);
  });

  it("flags caution verdicts", () => {
    expect(
      verdictFor(70, {
        tickerCollision: true,
        canonicalStock: false,
        lowLiquidity: false,
        extremePremium: false,
        unverifiedLookalike: true,
      }),
    ).toMatch(/CAUTION/);
  });
});

describe("chain helpers", () => {
  it("detects addresses", () => {
    expect(isAddress("0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC")).toBe(true);
    expect(isAddress("NVDA")).toBe(false);
  });
});

describe("mcp catalog", () => {
  it("exposes unique tools", () => {
    const names = TOOLS.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
    expect(names).toContain("scan_token");
    expect(names).toContain("get_desk");
    expect(names).toContain("list_pons_launches");
    expect(names).toContain("get_pons_token");
    expect(names).toContain("get_pons_protocol");
    expect(names).toContain("get_chart");
  });

  it("answers initialize and tools/list", async () => {
    const init = await handleMcpBody({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} });
    expect((init.payload as { result?: { serverInfo?: { name?: string } } }).result?.serverInfo?.name).toBe("apogee");
    const list = await handleMcpBody({ jsonrpc: "2.0", id: 2, method: "tools/list" });
    const tools = (list.payload as { result?: { tools?: unknown[] } }).result?.tools || [];
    expect(tools.length).toBe(TOOLS.length);
  });

  it("swallows notifications", async () => {
    const r = await handleMcpBody({ jsonrpc: "2.0", method: "notifications/initialized" });
    expect(r.notification).toBe(true);
  });
});
