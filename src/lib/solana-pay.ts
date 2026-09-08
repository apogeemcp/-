/**
 * Manual Solana payments for MCP access.
 * Users send SOL or USDC to the treasury, then submit a Solscan transaction URL.
 * Access is granted only after the signature is fetched from Solana RPC and the
 * treasury is shown as a recipient. $ORBITX buy-and-burn is not executed here.
 */

export const SOLANA_TREASURY = "8PXzJzumhLi2Kwpid1Xf5bodeEFeKRDbq8rmCU1ycVRF";
export const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,88}$/;

export function paymentTreasury(): string {
  return process.env.APOGEE_TREASURY_ADDRESS?.trim() || SOLANA_TREASURY;
}

export function solanaRpcUrl(): string {
  return process.env.APOGEE_SOLANA_RPC_URL?.trim() || "https://api.mainnet-beta.solana.com";
}

export function solscanTxUrl(signature: string): string {
  return `https://solscan.io/tx/${signature}`;
}

export function parseSolscanInput(raw: string): { ok: true; signature: string } | { ok: false; error: string } {
  const value = String(raw || "").trim();
  if (!value) return { ok: false, error: "Paste a Solscan transaction link or signature." };
  let signature = value;
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    if (host !== "solscan.io") {
      return { ok: false, error: "Only solscan.io transaction links are accepted." };
    }
    const parts = url.pathname.split("/").filter(Boolean);
    const txIdx = parts.findIndex((p) => p === "tx" || p === "transaction");
    signature = txIdx >= 0 ? parts[txIdx + 1] || "" : "";
  } catch {
    signature = value;
  }
  if (!BASE58.test(signature) || signature.length < 64) {
    return { ok: false, error: "That is not a Solana transaction signature." };
  }
  return { ok: true, signature };
}

function pubkeyOf(entry: unknown): string | null {
  if (typeof entry === "string") return entry;
  if (entry && typeof entry === "object" && "pubkey" in entry) return String((entry as { pubkey: string }).pubkey);
  return null;
}

function flattenKeys(tx: SolanaTx): string[] {
  const message = tx.transaction?.message;
  const meta = tx.meta;
  const keys = (message?.accountKeys || []).map(pubkeyOf).filter((x): x is string => Boolean(x));
  for (const extra of meta?.loadedAddresses?.writable || []) {
    const p = pubkeyOf(extra);
    if (p) keys.push(p);
  }
  for (const extra of meta?.loadedAddresses?.readonly || []) {
    const p = pubkeyOf(extra);
    if (p) keys.push(p);
  }
  return keys;
}

type TokenBal = {
  accountIndex?: number;
  mint?: string;
  owner?: string;
  uiTokenAmount?: { uiAmount?: number | null; amount?: string; decimals?: number };
};

type SolanaTx = {
  meta?: {
    err?: unknown;
    preBalances?: number[];
    postBalances?: number[];
    preTokenBalances?: TokenBal[];
    postTokenBalances?: TokenBal[];
    loadedAddresses?: { writable?: unknown[]; readonly?: unknown[] };
  };
  transaction?: {
    message?: {
      accountKeys?: unknown[];
    };
  };
};

export type PaymentProof = {
  signature: string;
  explorerUrl: string;
  payer: string | null;
  asset: "SOL" | "USDC" | "unknown";
  amount: number | null;
  treasury: string;
};

export async function verifyTreasuryPayment(signature: string): Promise<
  { ok: true; proof: PaymentProof } | { ok: false; state: "transaction_not_found" | "failed"; error: string }
> {
  const treasury = paymentTreasury();
  const res = await fetch(solanaRpcUrl(), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "getTransaction",
      params: [signature, { encoding: "jsonParsed", maxSupportedTransactionVersion: 0, commitment: "confirmed" }],
    }),
    signal: AbortSignal.timeout(12_000),
  }).catch((e) => {
    throw e;
  });
  const json = (await res.json().catch(() => null)) as { result?: SolanaTx | null; error?: { message?: string } } | null;
  if (!json || json.error) {
    return { ok: false, state: "failed", error: json?.error?.message || "Solana RPC error." };
  }
  if (!json.result) {
    return {
      ok: false,
      state: "transaction_not_found",
      error: "Transaction not found on Solana yet. Wait for confirmation, then paste the Solscan link again.",
    };
  }
  const tx = json.result;
  if (tx.meta?.err) {
    return { ok: false, state: "failed", error: "That transaction failed on-chain. It cannot unlock access." };
  }
  const keys = flattenKeys(tx);
  const treasuryIdx = keys.findIndex((k) => k === treasury);
  const payer = keys[0] || null;
  let solIn = 0;
  if (treasuryIdx >= 0) {
    const pre = tx.meta?.preBalances?.[treasuryIdx] ?? 0;
    const post = tx.meta?.postBalances?.[treasuryIdx] ?? 0;
    solIn = post - pre;
  }
  const usdcIn = tokenDelta(tx.meta?.preTokenBalances, tx.meta?.postTokenBalances, treasury, USDC_MINT);
  if (solIn <= 0 && usdcIn <= 0) {
    return {
      ok: false,
      state: "failed",
      error: `This transaction does not send SOL or USDC to ${treasury}.`,
    };
  }
  return {
    ok: true,
    proof: {
      signature,
      explorerUrl: solscanTxUrl(signature),
      payer,
      asset: usdcIn > 0 ? "USDC" : "SOL",
      amount: usdcIn > 0 ? usdcIn : solIn / 1_000_000_000,
      treasury,
    },
  };
}

function tokenDelta(pre: TokenBal[] | undefined, post: TokenBal[] | undefined, owner: string, mint: string): number {
  const before = (pre || [])
    .filter((b) => b.owner === owner && b.mint === mint)
    .reduce((s, b) => s + Number(b.uiTokenAmount?.uiAmount || 0), 0);
  const after = (post || [])
    .filter((b) => b.owner === owner && b.mint === mint)
    .reduce((s, b) => s + Number(b.uiTokenAmount?.uiAmount || 0), 0);
  return after - before;
}
