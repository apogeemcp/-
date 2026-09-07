import { describe, expect, it } from "vitest";
import { scanToken, searchToken } from "@/lib/intel";

describe("live robinhood intel", () => {
  it("resolves canonical NVDA on chain 4663", async () => {
    const scan = await scanToken("NVDA");
    expect(scan.ok).toBe(true);
    if (!scan.ok || !("token" in scan)) throw new Error("scan failed");
    expect(scan.token.symbol).toBe("NVDA");
    expect(String(scan.token.address).toLowerCase()).toBe("0xd0601ce157db5bdc3162bbac2a2c8af5320d9eec");
    expect(scan.token.canonicalStock).toBe(true);
    expect(scan.verdict).toBe("CANONICAL STOCK TOKEN");
  }, 30_000);

  it("searches USDG on robinhood", async () => {
    const res = await searchToken("USDG");
    expect(res.pairs.length + res.stocks.length).toBeGreaterThan(0);
  }, 20_000);
});
