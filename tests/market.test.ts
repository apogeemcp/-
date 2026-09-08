import { describe, expect, it } from "vitest";
import { finiteNumber, marketFlags, moneyField } from "../src/lib/market";
import { searchSite, siteSearchIndex } from "../src/lib/search";

describe("market numbers", () => {
  it("drops non-finite and negative USD fields", () => {
    expect(finiteNumber("1.5")).toBe(1.5);
    expect(finiteNumber("nope")).toBeNull();
    expect(moneyField(-1)).toBeNull();
    expect(moneyField(Infinity)).toBeNull();
    expect(moneyField(-3, { allowNegative: true })).toBe(-3);
  });

  it("flags impossible market values", () => {
    expect(marketFlags({ priceUsd: -1 }).flags).toContain("negative-price");
    expect(marketFlags({ liquidityUsd: -5 }).flags).toContain("negative-liquidity");
    expect(marketFlags({ priceUsd: 1, supply: 100, mcapUsd: 100 }).suspicious).toBe(false);
    expect(marketFlags({ priceUsd: 1, supply: 100, mcapUsd: 1_000_000 }).flags).toContain("mcap-supply-mismatch");
  });
});

describe("site search", () => {
  it("indexes core routes and finds Desk / developers", () => {
    expect(siteSearchIndex().some((h) => h.href === "/dashboard")).toBe(true);
    expect(searchSite("desk").some((h) => h.href === "/dashboard")).toBe(true);
    expect(searchSite("developers").some((h) => h.href.startsWith("/developers") || h.href === "/docs")).toBe(true);
  });

  it("routes a 0x query to token and wallet", () => {
    const addr = "0x39dbed3a2bd333467115de45665cc57f813c4571";
    const hits = searchSite(addr);
    expect(hits.some((h) => h.href === `/token/${addr}`)).toBe(true);
    expect(hits.some((h) => h.href.includes("/wallet"))).toBe(true);
  });
});
