import { describe, expect, it } from "vitest";
import {
  allocateUsd,
  BURN_BPS,
  checkoutBlocker,
  expiresAtIso,
  getPlan,
  MCP_ACCESS,
  publicCatalogPayload,
  publishedPlans,
  remainingCopy,
  treasuryAddress,
} from "../src/lib/access";
import { lookupPlanOrThrow } from "../src/lib/checkout";
import { buildSiweMessage } from "../src/lib/session";
import { parseSolscanInput, SOLANA_TREASURY, solscanMemoViews, solscanTxUrl } from "../src/lib/solana-pay";

describe("MCP access catalog", () => {
  it("publishes the five official USD plans", () => {
    const plans = publishedPlans();
    expect(plans.map((p) => p.label)).toEqual(["1 Day", "3 Days", "1 Week", "1 Month", "Lifetime"]);
    expect(plans.map((p) => p.priceUsd)).toEqual([100, 250, 500, 2500, 5000]);
    expect(plans.filter((p) => p.kind === "rental")).toHaveLength(4);
    expect(plans.find((p) => p.kind === "lifetime")?.durationHours).toBeNull();
    expect(plans.find((p) => p.recommended)?.id).toBe("week-1");
  });

  it("allocates 25% burn / 75% ops of list price", () => {
    expect(BURN_BPS).toBe(2500);
    expect(allocateUsd(500)).toEqual({ burnUsd: 125, opsUsd: 375 });
    expect(allocateUsd(2500)).toEqual({ burnUsd: 625, opsUsd: 1875 });
    expect(allocateUsd(100)).toEqual({ burnUsd: 25, opsUsd: 75 });
    expect(allocateUsd(5000)).toEqual({ burnUsd: 1250, opsUsd: 3750 });
  });

  it("computes rental expiry and remaining copy", () => {
    const plan = getPlan("day-1")!;
    const start = new Date("2026-09-08T00:00:00.000Z");
    expect(expiresAtIso(plan, start)).toBe("2026-09-09T00:00:00.000Z");
    expect(expiresAtIso(getPlan("lifetime")!, start)).toBeNull();
    expect(remainingCopy("2026-09-09T00:00:00.000Z", start.getTime())).toBe("24 HOURS REMAINING");
    expect(remainingCopy("2026-09-08T00:00:00.000Z", start.getTime())).toBe("EXPIRED");
  });

  it("publishes the Solana treasury and keeps burns manual", () => {
    expect(MCP_ACCESS.liveAuth).toBe("none");
    expect(MCP_ACCESS.liveStatus).toBe("public");
    expect(MCP_ACCESS.burnProcess).toMatch(/not automatic/i);
    expect(checkoutBlocker()).toBeNull();
    expect(treasuryAddress()).toBe(SOLANA_TREASURY);
    const catalog = publicCatalogPayload();
    expect(catalog.live.checkout).toBe("manual_solana");
    expect(catalog.treasury).toBe(SOLANA_TREASURY);
    expect(catalog.plans).toHaveLength(5);
    expect(catalog.plans[2].burnUsd).toBe(125);
  });
});

describe("checkout integrity", () => {
  it("looks up plans on the server and ignores unknown ids", () => {
    expect(lookupPlanOrThrow("week-1").priceUsd).toBe(500);
    expect(() => lookupPlanOrThrow("invented")).toThrow(/unknown plan/i);
  });
});

describe("Solscan confirmation", () => {
  it("accepts solscan.io/tx links and raw signatures", () => {
    const sig = "4".repeat(88);
    expect(parseSolscanInput(`https://solscan.io/tx/${sig}`)).toEqual({ ok: true, signature: sig });
    expect(parseSolscanInput(`https://solscan.io/tx/${sig}?cluster=mainnet`)).toEqual({ ok: true, signature: sig });
    expect(parseSolscanInput(sig)).toEqual({ ok: true, signature: sig });
    expect(solscanTxUrl(sig)).toBe(`https://solscan.io/tx/${sig}`);
    const views = solscanMemoViews(sig, "Wallet111");
    expect(views.instructions).toBe(`https://solscan.io/tx/${sig}?tab=instructions`);
    expect(views.logs).toBe(`https://solscan.io/tx/${sig}?tab=programLogs`);
    expect(views.raw).toBe(`https://solscan.io/tx/${sig}?tab=raw`);
    expect(views.account).toBe("https://solscan.io/account/Wallet111#transactions");
    expect(parseSolscanInput(views.raw)).toEqual({ ok: true, signature: sig });
  });

  it("rejects non-solscan URLs and junk", () => {
    expect(parseSolscanInput("https://example.com/tx/abc").ok).toBe(false);
    expect(parseSolscanInput("https://solscan.io/account/8PXz").ok).toBe(false);
    expect(parseSolscanInput("not-a-sig").ok).toBe(false);
  });
});

describe("wallet challenge", () => {
  it("binds nonce and address into the signed message", () => {
    const message = buildSiweMessage({
      origin: "https://apogeemcp.digital",
      address: "0xabc",
      nonce: "deadbeef",
      issuedAt: "2026-09-08T00:00:00.000Z",
    });
    expect(message).toContain("Nonce: deadbeef");
    expect(message).toContain("0xabc");
    expect(message).toMatch(/does not purchase MCP access/i);
  });
});
