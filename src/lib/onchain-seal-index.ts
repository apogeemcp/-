import { SEAL_BURN_USD, scanUrl } from "./onchain-config";
import { parseSealMemo, sealImageUrl } from "./onchain-seal";
import type { RawServiceTx } from "./onchain-chain-index";

export type PublicSeal = {
  id: string;
  note: string;
  memo: string;
  tokenMint: string;
  tokenSymbol: string;
  tokenName: string;
  imageId: string;
  imageUrl: string;
  nftMint: string;
  sha256: string;
  memoStatus: "idle" | "pending" | "confirmed" | "failed";
  buyStatus: "idle" | "pending" | "confirmed" | "failed";
  burnStatus: "idle" | "pending" | "confirmed" | "failed";
  memoTx: string | null;
  buyTx: string | null;
  burnTx: string | null;
  nftTx: string | null;
  memoUrl: string | null;
  buyUrl: string | null;
  burnUrl: string | null;
  tokenAmount: number | null;
  usdValue: number | null;
  solSpent: number | null;
  priceUsd: number | null;
  createdAt: string;
  error: string | null;
};

export function assembleSealsFromChain(txsNewestFirst: RawServiceTx[]): PublicSeal[] {
  const chrono = [...txsNewestFirst].reverse();
  const seals: PublicSeal[] = [];
  let open: PublicSeal | null = null;
  const flush = () => {
    if (open) seals.push(open);
    open = null;
  };
  for (const tx of chrono) {
    const parsed = tx.memo ? parseSealMemo(tx.memo) : null;
    if (parsed?.ok) {
      flush();
      const at = tx.blockTime || new Date().toISOString();
      open = {
        id: tx.signature,
        note: parsed.seal.note,
        memo: tx.memo || "",
        tokenMint: parsed.token.mint,
        tokenSymbol: parsed.token.symbol,
        tokenName: parsed.token.name,
        imageId: parsed.seal.imageId,
        imageUrl: sealImageUrl(parsed.seal.imageId),
        nftMint: parsed.seal.nftMint,
        sha256: parsed.seal.sha256,
        memoStatus: "confirmed",
        buyStatus: "idle",
        burnStatus: "idle",
        memoTx: tx.signature,
        buyTx: null,
        burnTx: null,
        nftTx: null,
        memoUrl: scanUrl(tx.signature),
        buyUrl: null,
        burnUrl: null,
        tokenAmount: null,
        usdValue: SEAL_BURN_USD,
        solSpent: null,
        priceUsd: null,
        createdAt: at,
        error: null,
      };
      continue;
    }
    if (!open) continue;
    const delta = tx.mintDeltas?.[open.tokenMint] ?? 0;
    if (delta > 1e-9 && open.buyStatus !== "confirmed") {
      open.buyStatus = "confirmed";
      open.buyTx = tx.signature;
      open.buyUrl = scanUrl(tx.signature);
      open.tokenAmount = delta;
      open.solSpent = Math.abs(tx.solDelta);
      continue;
    }
    if (delta < -1e-9 && open.burnStatus !== "confirmed") {
      open.burnStatus = "confirmed";
      open.burnTx = tx.signature;
      open.burnUrl = scanUrl(tx.signature);
      open.tokenAmount = Math.abs(delta);
    }
  }
  flush();
  return seals.reverse();
}
