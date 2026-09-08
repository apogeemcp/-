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
} from "../src/lib/access";
import { lookupPlanOrThrow, rejectUnverifiedConfirm } from "../src/lib/checkout";
import { buildSiweMessage } from "../src/lib/session";

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

  it("does not claim live paid gating or automated burns", () => {
    expect(MCP_ACCESS.liveAuth).toBe("none");
    expect(MCP_ACCESS.liveStatus).toBe("public");
    expect(MCP_ACCESS.burnProcess).toMatch(/not automated/i);
    expect(checkoutBlocker()?.state).toBe("unavailable");
    const catalog = publicCatalogPayload();
    expect(catalog.live.checkout).toBe("unavailable");
    expect(catalog.plans).toHaveLength(5);
    expect(catalog.plans[2].burnUsd).toBe(125);
  });
});

describe("checkout integrity", () => {
  it("looks up plans on the server and ignores unknown ids", () => {
    expect(lookupPlanOrThrow("week-1").priceUsd).toBe(500);
    expect(() => lookupPlanOrThrow("invented")).toThrow(/unknown plan/i);
  });

  it("never confirms a client-submitted transaction", () => {
    const rejected = rejectUnverifiedConfirm();
    expect(rejected.ok).toBe(false);
    expect(rejected.state).toBe("unavailable");
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
