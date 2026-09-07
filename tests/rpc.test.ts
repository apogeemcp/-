import { describe, expect, it } from "vitest";
import { decodeHexString, formatUnits, padAddress } from "@/lib/rpc";

describe("rpc codecs", () => {
  it("pads addresses for balanceOf", () => {
    expect(padAddress("0xabc")).toHaveLength(64);
  });

  it("formats units", () => {
    expect(formatUnits(1500000000000000000n, 18)).toBe("1.5");
    expect(formatUnits(0n, 18)).toBe("0");
  });

  it("decodes short hex strings", () => {
    const hex = "0x" + Buffer.from("NVDA").toString("hex").padEnd(64, "0");
    expect(decodeHexString(hex)).toContain("NVDA");
  });
});
