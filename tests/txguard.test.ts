import { describe, expect, it } from "vitest";
import { assertLaunchTx, LAUNCH_TOKEN_SELECTOR, PONS_V2_FACTORY } from "../src/lib/txguard";
import { CHAIN } from "../src/lib/chain";

const okTx = {
  to: PONS_V2_FACTORY,
  data: `${LAUNCH_TOKEN_SELECTOR}${"00".repeat(32)}`,
  value: "0x1c6bf52634000", // 0.0005 ETH
  chainId: CHAIN.hexId,
};

describe("assertLaunchTx", () => {
  it("accepts a pons v2 launchToken call under the fee cap", () => {
    const safe = assertLaunchTx(okTx);
    expect(safe.to).toBe(PONS_V2_FACTORY);
    expect(safe.chainId).toBe(CHAIN.hexId);
  });

  it("rejects a different destination", () => {
    expect(() => assertLaunchTx({ ...okTx, to: "0x0000000000000000000000000000000000000001" })).toThrow(
      /pons v2 factory/i,
    );
  });

  it("rejects a non-launch selector", () => {
    expect(() => assertLaunchTx({ ...okTx, data: "0xdeadbeef" })).toThrow(/launchToken/i);
  });

  it("rejects a huge value", () => {
    expect(() => assertLaunchTx({ ...okTx, value: "0xde0b6b3a7640000" })).toThrow(/larger than expected/i);
  });

  it("rejects missing fee", () => {
    expect(() => assertLaunchTx({ ...okTx, value: "0x0" })).toThrow(/fee is missing/i);
  });

  it("rejects the wrong chain", () => {
    expect(() => assertLaunchTx({ ...okTx, chainId: "0x1" })).toThrow(/Wrong chain/i);
  });
});
