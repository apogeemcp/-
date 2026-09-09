import { describe, expect, it } from "vitest";
import { assembleFromChain } from "../src/lib/onchain-chain-index";
import {
  loadAssembledFromSql,
  loadWalletSnapshot,
  persistAssembled,
  persistNoteBundle,
  saveWalletSnapshot,
  sqlConfigured,
} from "../src/lib/onchain-sql";

const live = sqlConfigured();

describe.skipIf(!live)("on-chain SQL index", () => {
  it("persists memo, price, and wallet without a JWT", async () => {
    const assembled = assembleFromChain([
      { signature: "burnsig", slot: 3, blockTime: "2026-09-09T10:00:03.000Z", memo: null, orbitxDelta: -50, solDelta: 0 },
      { signature: "buysig", slot: 2, blockTime: "2026-09-09T10:00:02.000Z", memo: null, orbitxDelta: 50, solDelta: -0.0003 },
      {
        signature: "memosig",
        slot: 1,
        blockTime: "2026-09-09T10:00:01.000Z",
        memo: "ORBITX_NOTE:v1:SQL index smoke",
        orbitxDelta: 0,
        solDelta: 0,
      },
    ]);
    assembled.notes[0].priceUsd = 0.000034;
    await persistAssembled(assembled);
    await persistNoteBundle(assembled.notes[0]);
    await saveWalletSnapshot({
      wallet: assembled.notes[0].wallet,
      sol: 0.012,
      orbitx: 10,
      priceUsd: 0.000034,
      estimatedSolForNote: 0.0002,
      ready: true,
    });
    const loaded = await loadAssembledFromSql(20);
    expect(loaded?.notes[0].note).toBe("SQL index smoke");
    expect(loaded?.notes[0].priceUsd).toBe(0.000034);
    expect(loaded?.notes[0].usdValue).toBe(0.03);
    expect(loaded?.activity.some((a) => a.event_type === "MEMO_CREATED" && a.memo?.includes("SQL index smoke"))).toBe(true);
    const snap = await loadWalletSnapshot();
    expect(snap?.priceUsd).toBe(0.000034);
    expect(snap?.sol).toBe(0.012);
  });
});
