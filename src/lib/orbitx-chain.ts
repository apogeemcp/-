import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  VersionedTransaction,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
  type ParsedTransactionWithMeta,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  createBurnInstruction,
  createCloseAccountInstruction,
  getAssociatedTokenAddressSync,
  getMint,
} from "@solana/spl-token";
import {
  MEMO_PROGRAM_ID,
  NOTE_BURN_USD,
  ORBITX_MINT,
  WSOL_MINT,
  scanUrl,
  solanaRpc,
} from "./onchain-config";
import { loadServiceKeypair, servicePublicAddress } from "./orbitx-signer";

export type ConfirmedTx = {
  signature: string;
  slot: number | null;
  blockTime: string | null;
  explorerUrl: string;
};

function connection(): Connection {
  return new Connection(solanaRpc(), { commitment: "confirmed" });
}

export async function getRecentFeeSol(): Promise<number> {
  return 5000 / LAMPORTS_PER_SOL;
}

export async function serviceBalances(): Promise<{ sol: number; orbitx: number; wallet: string }> {
  const wallet = servicePublicAddress();
  const conn = connection();
  const owner = new PublicKey(wallet);
  const sol = (await conn.getBalance(owner, "confirmed")) / LAMPORTS_PER_SOL;
  let orbitx = 0;
  try {
    const mint = new PublicKey(ORBITX_MINT);
    const program = await tokenProgramForMint(conn, mint);
    const ata = getAssociatedTokenAddressSync(mint, owner, false, program);
    const bal = await conn.getTokenAccountBalance(ata, "confirmed").catch(() => null);
    orbitx = Number(bal?.value.uiAmount || 0);
  } catch {
    orbitx = 0;
  }
  return { sol, orbitx, wallet };
}

async function tokenProgramForMint(conn: Connection, mint: PublicKey) {
  const info = await conn.getAccountInfo(mint, "confirmed");
  if (info?.owner.equals(TOKEN_2022_PROGRAM_ID)) return TOKEN_2022_PROGRAM_ID;
  return TOKEN_PROGRAM_ID;
}

export async function sendMemo(memoText: string): Promise<ConfirmedTx> {
  const payer = loadServiceKeypair();
  const conn = connection();
  const ix = new TransactionInstruction({
    keys: [{ pubkey: payer.publicKey, isSigner: true, isWritable: false }],
    programId: new PublicKey(MEMO_PROGRAM_ID),
    data: Buffer.from(memoText, "utf8"),
  });
  const tx = new Transaction().add(ix);
  const signature = await sendAndConfirmTransaction(conn, tx, [payer], {
    commitment: "confirmed",
    maxRetries: 3,
  });
  const parsed = await conn.getTransaction(signature, { commitment: "confirmed", maxSupportedTransactionVersion: 0 });
  return {
    signature,
    slot: parsed?.slot ?? null,
    blockTime: parsed?.blockTime ? new Date(parsed.blockTime * 1000).toISOString() : new Date().toISOString(),
    explorerUrl: scanUrl(signature),
  };
}

export async function orbitxMarketPrice(): Promise<{ priceUsd: number; source: string } | null> {
  const mint = ORBITX_MINT;
  const dex = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(10_000),
  })
    .then((r) => r.json())
    .catch(() => null);
  const pairs = Array.isArray(dex?.pairs) ? dex.pairs : [];
  const best = pairs
    .filter((p: { priceUsd?: string }) => Number(p.priceUsd) > 0)
    .sort((a: { liquidity?: { usd?: number } }, b: { liquidity?: { usd?: number } }) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0];
  const price = Number(best?.priceUsd);
  if (Number.isFinite(price) && price > 0) return { priceUsd: price, source: "dexscreener" };

  const jup = await fetch(`https://lite-api.jup.ag/price/v3?ids=${mint}`, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(10_000),
  })
    .then((r) => r.json())
    .catch(() => null);
  const jupPrice = Number(jup?.[mint]?.usdPrice ?? jup?.data?.[mint]?.price ?? jup?.[mint]?.price);
  if (Number.isFinite(jupPrice) && jupPrice > 0) return { priceUsd: jupPrice, source: "jupiter" };
  return null;
}

async function solPriceUsd(): Promise<number | null> {
  const jup = await fetch(`https://lite-api.jup.ag/price/v3?ids=${WSOL_MINT}`, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(10_000),
  })
    .then((r) => r.json())
    .catch(() => null);
  const p = Number(jup?.[WSOL_MINT]?.usdPrice ?? jup?.data?.[WSOL_MINT]?.price);
  if (Number.isFinite(p) && p > 0) return p;
  const cg = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd", {
    signal: AbortSignal.timeout(10_000),
  })
    .then((r) => r.json())
    .catch(() => null);
  const c = Number(cg?.solana?.usd);
  return Number.isFinite(c) && c > 0 ? c : null;
}

export async function sizeNoteBurn(): Promise<{
  usd: number;
  solLamports: number;
  solAmount: number;
  priceUsd: number;
  solUsd: number;
}> {
  const [token, solUsd] = await Promise.all([orbitxMarketPrice(), solPriceUsd()]);
  if (!token) throw new Error("No executable $ORBITX market price is available.");
  if (!solUsd) throw new Error("Could not read SOL/USD for sizing the $0.02 buy.");
  const solAmount = NOTE_BURN_USD / solUsd;
  const solLamports = Math.max(5_000, Math.ceil(solAmount * LAMPORTS_PER_SOL * 1.01));
  return { usd: NOTE_BURN_USD, solLamports, solAmount: solLamports / LAMPORTS_PER_SOL, priceUsd: token.priceUsd, solUsd };
}

async function jupiterSwap(lamports: number): Promise<{ signature: string; outAmountRaw: string; outUi: number }> {
  const payer = loadServiceKeypair();
  const quoteUrls = [
    `https://lite-api.jup.ag/swap/v1/quote?inputMint=${WSOL_MINT}&outputMint=${ORBITX_MINT}&amount=${lamports}&slippageBps=150&restrictIntermediateTokens=true`,
    `https://quote-api.jup.ag/v6/quote?inputMint=${WSOL_MINT}&outputMint=${ORBITX_MINT}&amount=${lamports}&slippageBps=150`,
  ];
  let quote: Record<string, unknown> | null = null;
  for (const url of quoteUrls) {
    const res = await fetch(url, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(12_000) }).catch(
      () => null,
    );
    if (res?.ok) {
      quote = (await res.json()) as Record<string, unknown>;
      if (quote && (quote.outAmount || quote.data)) break;
    }
  }
  if (!quote || !quote.outAmount) {
    throw new Error("Jupiter has no SOL → $ORBITX route for this size. Buy not executed.");
  }
  const swapUrls = ["https://lite-api.jup.ag/swap/v1/swap", "https://quote-api.jup.ag/v6/swap"];
  let swapTx: string | null = null;
  for (const url of swapUrls) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: AbortSignal.timeout(12_000),
      body: JSON.stringify({
        quoteResponse: quote,
        userPublicKey: payer.publicKey.toBase58(),
        wrapAndUnwrapSol: true,
        dynamicComputeUnitLimit: true,
      }),
    }).catch(() => null);
    if (!res?.ok) continue;
    const body = (await res.json()) as { swapTransaction?: string };
    if (body.swapTransaction) {
      swapTx = body.swapTransaction;
      break;
    }
  }
  if (!swapTx) throw new Error("Jupiter did not return a swap transaction.");
  const conn = connection();
  const raw = Buffer.from(swapTx, "base64");
  let signature: string;
  try {
    const vtx = VersionedTransaction.deserialize(raw);
    vtx.sign([payer]);
    signature = await conn.sendTransaction(vtx, { maxRetries: 3, skipPreflight: false });
    await conn.confirmTransaction(signature, "confirmed");
  } catch {
    const tx = Transaction.from(raw);
    tx.partialSign(payer);
    signature = await sendAndConfirmTransaction(conn, tx, [payer], { commitment: "confirmed", maxRetries: 3 });
  }
  const mint = await getMint(conn, new PublicKey(ORBITX_MINT), "confirmed", await tokenProgramForMint(conn, new PublicKey(ORBITX_MINT)));
  const outRaw = String(quote.outAmount);
  const outUi = Number(outRaw) / 10 ** mint.decimals;
  return { signature, outAmountRaw: outRaw, outUi };
}

export async function buyOrbitxForNote(): Promise<{
  tx: ConfirmedTx;
  tokenAmount: number;
  usdValue: number;
  solSpent: number;
  priceUsd: number;
}> {
  const size = await sizeNoteBurn();
  const balances = await serviceBalances();
  if (balances.sol < size.solAmount + 0.002) {
    throw new Error("Service wallet does not have enough SOL to buy $0.02 of $ORBITX.");
  }
  const swap = await jupiterSwap(size.solLamports);
  return {
    tx: { signature: swap.signature, slot: null, blockTime: new Date().toISOString(), explorerUrl: scanUrl(swap.signature) },
    tokenAmount: swap.outUi,
    usdValue: size.usd,
    solSpent: size.solAmount,
    priceUsd: size.priceUsd,
  };
}

export async function burnOrbitx(amountUi?: number): Promise<{ tx: ConfirmedTx; tokenAmount: number }> {
  const payer = loadServiceKeypair();
  const conn = connection();
  const mint = new PublicKey(ORBITX_MINT);
  const program = await tokenProgramForMint(conn, mint);
  const mintInfo = await getMint(conn, mint, "confirmed", program);
  const ata = getAssociatedTokenAddressSync(mint, payer.publicKey, false, program);
  const bal = await conn.getTokenAccountBalance(ata, "confirmed");
  const have = BigInt(bal.value.amount);
  if (have <= 0n) throw new Error("Service wallet holds no $ORBITX to burn.");
  let burnAmount = have;
  if (amountUi != null && Number.isFinite(amountUi) && amountUi > 0) {
    const wanted = BigInt(Math.floor(amountUi * 10 ** mintInfo.decimals));
    if (wanted > 0n && wanted <= have) burnAmount = wanted;
  }
  const tx = new Transaction().add(
    createBurnInstruction(ata, mint, payer.publicKey, burnAmount, [], program),
    createCloseAccountInstruction(ata, payer.publicKey, payer.publicKey, [], program),
  );
  // Keep the ATA if leftover tokens remain.
  if (burnAmount < have) {
    tx.instructions.pop();
  }
  const signature = await sendAndConfirmTransaction(conn, tx, [payer], { commitment: "confirmed", maxRetries: 3 });
  return {
    tx: { signature, slot: null, blockTime: new Date().toISOString(), explorerUrl: scanUrl(signature) },
    tokenAmount: Number(burnAmount) / 10 ** mintInfo.decimals,
  };
}

export async function readMemoFromSignature(signature: string): Promise<{
  ok: boolean;
  memo?: string;
  slot?: number | null;
  blockTime?: string | null;
  error?: string;
}> {
  const conn = connection();
  const parsed = await conn.getParsedTransaction(signature, { commitment: "confirmed", maxSupportedTransactionVersion: 0 });
  if (!parsed) return { ok: false, error: "Transaction not found on Solana." };
  const ixs = parsed.transaction.message.instructions as Array<{ programId?: PublicKey | string; parsed?: { type?: string; info?: { memo?: string } }; data?: string }>;
  let memo: string | undefined;
  for (const ix of ixs) {
    const pid = typeof ix.programId === "string" ? ix.programId : ix.programId?.toBase58?.();
    if (pid === MEMO_PROGRAM_ID) {
      if (ix.parsed?.info?.memo) memo = String(ix.parsed.info.memo);
      else if (ix.data) {
        try {
          memo = Buffer.from(ix.data, "base64").toString("utf8");
        } catch {
          memo = undefined;
        }
      }
    }
  }
  if (!memo) {
    const logs = parsed.meta?.logMessages || [];
    const line = logs.find((l) => l.includes("Memo") || l.includes(MEMO_PROGRAM_ID));
    if (line) memo = line.replace(/^Program log: Memo \(len \d+\): /, "").replace(/^Program log: /, "");
  }
  return {
    ok: true,
    memo,
    slot: parsed.slot,
    blockTime: parsed.blockTime ? new Date(parsed.blockTime * 1000).toISOString() : null,
  };
}

export type RawServiceTx = {
  signature: string;
  slot: number | null;
  blockTime: string | null;
  memo: string | null;
  orbitxDelta: number;
  solDelta: number;
};

function memoFromParsed(parsed: ParsedTransactionWithMeta): string | null {
  const outer = (parsed.transaction?.message?.instructions || []) as Array<{
    programId?: PublicKey | string;
    parsed?: { type?: string; info?: { memo?: string } };
    data?: string;
  }>;
  const inner = (parsed.meta?.innerInstructions || []).flatMap((g) => g.instructions || []) as typeof outer;
  for (const ix of [...outer, ...inner]) {
    const pid = typeof ix.programId === "string" ? ix.programId : ix.programId?.toBase58?.();
    if (pid !== MEMO_PROGRAM_ID) continue;
    if (ix.parsed?.info?.memo) return String(ix.parsed.info.memo).replace(/^"|"$/g, "");
    if (ix.data) {
      try {
        return Buffer.from(ix.data, "base64").toString("utf8");
      } catch {
        /* continue */
      }
    }
  }
  const logs = parsed.meta?.logMessages || [];
  const line = logs.find((l) => l.includes("Memo") || l.includes(MEMO_PROGRAM_ID));
  if (!line) return null;
  return line.replace(/^Program log: Memo \(len \d+\): /, "").replace(/^Program log: /, "").replace(/^"|"$/g, "");
}

function orbitxDeltaForWallet(parsed: ParsedTransactionWithMeta, owner: string): number {
  const sum = (
    rows: { mint: string; owner?: string; uiTokenAmount?: { uiAmount?: number | null } }[] | null | undefined,
  ) =>
    (rows || [])
      .filter((b) => b.mint === ORBITX_MINT && b.owner === owner)
      .reduce((s, b) => s + Number(b.uiTokenAmount?.uiAmount || 0), 0);
  return sum(parsed.meta?.postTokenBalances) - sum(parsed.meta?.preTokenBalances);
}

function solDeltaForWallet(parsed: ParsedTransactionWithMeta, owner: string): number {
  const keys = parsed.transaction.message.accountKeys || [];
  const idx = keys.findIndex((k) => k.pubkey.toBase58() === owner);
  if (idx < 0) return 0;
  const pre = Number(parsed.meta?.preBalances?.[idx] || 0);
  const post = Number(parsed.meta?.postBalances?.[idx] || 0);
  return (post - pre) / LAMPORTS_PER_SOL;
}

export async function fetchServiceRawTxs(limit = 48): Promise<RawServiceTx[]> {
  const conn = connection();
  const owner = servicePublicAddress();
  const sigs = await conn.getSignaturesForAddress(new PublicKey(owner), { limit: Math.min(80, Math.max(8, limit)) });
  const out: RawServiceTx[] = [];
  const chunk = 8;
  for (let i = 0; i < sigs.length; i += chunk) {
    const part = sigs.slice(i, i + chunk);
    const txs = await Promise.all(
      part.map((s) =>
        conn.getParsedTransaction(s.signature, { commitment: "confirmed", maxSupportedTransactionVersion: 0 }).catch(() => null),
      ),
    );
    for (let j = 0; j < part.length; j++) {
      const info = part[j];
      const parsed = txs[j];
      const blockTime = info.blockTime ? new Date(info.blockTime * 1000).toISOString() : null;
      if (!parsed) {
        out.push({ signature: info.signature, slot: info.slot, blockTime, memo: null, orbitxDelta: 0, solDelta: 0 });
        continue;
      }
      out.push({
        signature: info.signature,
        slot: parsed.slot ?? info.slot,
        blockTime: parsed.blockTime ? new Date(parsed.blockTime * 1000).toISOString() : blockTime,
        memo: memoFromParsed(parsed),
        orbitxDelta: orbitxDeltaForWallet(parsed, owner),
        solDelta: solDeltaForWallet(parsed, owner),
      });
    }
  }
  return out;
}

export { SystemProgram };
