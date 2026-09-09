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
  getAssociatedTokenAddressSync,
  getMint,
} from "@solana/spl-token";
import {
  MEMO_PROGRAM_ID,
  NOTE_BURN_USD,
  ORBITX_MINT,
  ORBITX_RESERVE_USD,
  WSOL_MINT,
  orbitxBurnUi,
  orbitxBuyUsd,
  scanUrl,
  solanaRpc,
  tokenBurnUi,
  tokenBuyUsd,
} from "./onchain-config";
import { extractMemoFromParsedParts } from "./onchain-memo";
import { loadServiceKeypair, servicePublicAddress } from "./orbitx-signer";

export type ConfirmedTx = {
  signature: string;
  slot: number | null;
  blockTime: string | null;
  explorerUrl: string;
};

function connection(): Connection {
  return new Connection(solanaRpc(), {
    commitment: "confirmed",
    disableRetryOnRateLimit: true,
  });
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

export async function getMintBalanceUi(mintAddress: string): Promise<number> {
  const wallet = servicePublicAddress();
  const conn = connection();
  try {
    const mint = new PublicKey(mintAddress);
    const program = await tokenProgramForMint(conn, mint);
    const ata = getAssociatedTokenAddressSync(mint, new PublicKey(wallet), false, program);
    const bal = await conn.getTokenAccountBalance(ata, "confirmed").catch(() => null);
    return Number(bal?.value.uiAmount || 0);
  } catch {
    return 0;
  }
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

export async function tokenMarketPrice(mint: string): Promise<{ priceUsd: number; source: string } | null> {
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

export async function orbitxMarketPrice(): Promise<{ priceUsd: number; source: string } | null> {
  return tokenMarketPrice(ORBITX_MINT);
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

export async function sizeNoteBuy(heldOrbitxUi?: number): Promise<{
  usd: number;
  burnUsd: number;
  reserveUsd: number;
  solLamports: number;
  solAmount: number;
  priceUsd: number;
  solUsd: number;
  heldUsd: number;
}> {
  const [token, solUsd, held] = await Promise.all([
    orbitxMarketPrice(),
    solPriceUsd(),
    heldOrbitxUi == null ? serviceBalances().then((b) => b.orbitx) : Promise.resolve(heldOrbitxUi),
  ]);
  if (!token) throw new Error("No executable $ORBITX market price is available.");
  if (!solUsd) throw new Error("Could not read SOL/USD for sizing the $ORBITX buy.");
  const heldUsd = Math.max(0, held) * token.priceUsd;
  const usd = orbitxBuyUsd(heldUsd);
  const solAmount = usd / solUsd;
  const solLamports = Math.max(5_000, Math.ceil(solAmount * LAMPORTS_PER_SOL * 1.01));
  return {
    usd,
    burnUsd: NOTE_BURN_USD,
    reserveUsd: ORBITX_RESERVE_USD,
    solLamports,
    solAmount: solLamports / LAMPORTS_PER_SOL,
    priceUsd: token.priceUsd,
    solUsd,
    heldUsd,
  };
}

export async function sizeNoteBurn(): Promise<{
  usd: number;
  solLamports: number;
  solAmount: number;
  priceUsd: number;
  solUsd: number;
}> {
  const size = await sizeNoteBuy();
  return {
    usd: size.usd,
    solLamports: size.solLamports,
    solAmount: size.solAmount,
    priceUsd: size.priceUsd,
    solUsd: size.solUsd,
  };
}

async function jupiterSwap(
  lamports: number,
  outputMint = ORBITX_MINT,
): Promise<{ signature: string; outAmountRaw: string; outUi: number }> {
  const payer = loadServiceKeypair();
  const quoteUrls = [
    `https://lite-api.jup.ag/swap/v1/quote?inputMint=${WSOL_MINT}&outputMint=${outputMint}&amount=${lamports}&slippageBps=150&restrictIntermediateTokens=true`,
    `https://quote-api.jup.ag/v6/quote?inputMint=${WSOL_MINT}&outputMint=${outputMint}&amount=${lamports}&slippageBps=150`,
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
    throw new Error("Jupiter has no SOL → token route for this size. Buy not executed.");
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
  const mint = await getMint(conn, new PublicKey(outputMint), "confirmed", await tokenProgramForMint(conn, new PublicKey(outputMint)));
  const outRaw = String(quote.outAmount);
  const outUi = Number(outRaw) / 10 ** mint.decimals;
  return { signature, outAmountRaw: outRaw, outUi };
}

export async function buyTokenForUsd(input: {
  mint: string;
  burnUsd: number;
  reserveUsd: number;
}): Promise<{
  tx: ConfirmedTx;
  tokenAmount: number;
  usdValue: number;
  solSpent: number;
  priceUsd: number;
}> {
  const [held, sol, token, solUsd] = await Promise.all([
    getMintBalanceUi(input.mint),
    serviceBalances().then((b) => b.sol),
    tokenMarketPrice(input.mint),
    solPriceUsd(),
  ]);
  if (!token) throw new Error("No executable market price is available for this token.");
  if (!solUsd) throw new Error("Could not read SOL/USD for sizing the buy.");
  const heldUsd = Math.max(0, held) * token.priceUsd;
  const usd = tokenBuyUsd(heldUsd, input.burnUsd, input.reserveUsd);
  const solAmount = usd / solUsd;
  const solLamports = Math.max(5_000, Math.ceil(solAmount * LAMPORTS_PER_SOL * 1.01));
  if (sol < solAmount + 0.002) {
    throw new Error(`Service wallet does not have enough SOL to buy $${usd.toFixed(2)} of this token.`);
  }
  const swap = await jupiterSwap(solLamports, input.mint);
  let after = held;
  for (let i = 0; i < 6; i++) {
    after = await getMintBalanceUi(input.mint);
    if (after > held) break;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  if (after <= held) after = held + Math.max(0, swap.outUi);
  const burnUi = tokenBurnUi(after, token.priceUsd, input.burnUsd, input.reserveUsd);
  return {
    tx: { signature: swap.signature, slot: null, blockTime: new Date().toISOString(), explorerUrl: scanUrl(swap.signature) },
    tokenAmount: burnUi,
    usdValue: input.burnUsd,
    solSpent: solLamports / LAMPORTS_PER_SOL,
    priceUsd: token.priceUsd,
  };
}

export async function buyOrbitxForNote(): Promise<{
  tx: ConfirmedTx;
  tokenAmount: number;
  usdValue: number;
  solSpent: number;
  priceUsd: number;
}> {
  return buyTokenForUsd({ mint: ORBITX_MINT, burnUsd: NOTE_BURN_USD, reserveUsd: ORBITX_RESERVE_USD });
}

export async function burnToken(
  mintAddress: string,
  amountUi?: number,
  reserveUsd = ORBITX_RESERVE_USD,
  burnUsd = NOTE_BURN_USD,
): Promise<{ tx: ConfirmedTx; tokenAmount: number }> {
  const payer = loadServiceKeypair();
  const conn = connection();
  const mint = new PublicKey(mintAddress);
  const program = await tokenProgramForMint(conn, mint);
  const mintInfo = await getMint(conn, mint, "confirmed", program);
  const ata = getAssociatedTokenAddressSync(mint, payer.publicKey, false, program);
  const bal = await conn.getTokenAccountBalance(ata, "confirmed");
  const have = BigInt(bal.value.amount);
  if (have <= 1n) throw new Error("Service wallet holds no spare tokens to burn.");
  const price = (await tokenMarketPrice(mintAddress))?.priceUsd ?? 0;
  const heldUi = Number(bal.value.uiAmount || 0);
  const reserveUi = price > 0 ? reserveUsd / price : 0;
  const reserveRaw = price > 0 ? BigInt(Math.ceil(reserveUi * 10 ** mintInfo.decimals)) : 1n;
  const minKeep = reserveRaw > 1n ? reserveRaw : 1n;
  const maxBurn = have > minKeep ? have - minKeep : 0n;
  if (maxBurn <= 0n) {
    throw new Error("Keeping the token float so the account stays open.");
  }
  let burnAmount = 0n;
  const wantedUi =
    amountUi != null && Number.isFinite(amountUi) && amountUi > 0
      ? amountUi
      : tokenBurnUi(heldUi, price, burnUsd, reserveUsd);
  const wanted = BigInt(Math.floor(wantedUi * 10 ** mintInfo.decimals));
  if (wanted > 0n) burnAmount = wanted < maxBurn ? wanted : maxBurn;
  if (burnAmount <= 0n) {
    throw new Error("Keeping the token float; nothing extra to burn.");
  }
  const tx = new Transaction().add(createBurnInstruction(ata, mint, payer.publicKey, burnAmount, [], program));
  const signature = await sendAndConfirmTransaction(conn, tx, [payer], { commitment: "confirmed", maxRetries: 3 });
  return {
    tx: { signature, slot: null, blockTime: new Date().toISOString(), explorerUrl: scanUrl(signature) },
    tokenAmount: Number(burnAmount) / 10 ** mintInfo.decimals,
  };
}

export async function burnOrbitx(amountUi?: number): Promise<{ tx: ConfirmedTx; tokenAmount: number }> {
  return burnToken(ORBITX_MINT, amountUi, ORBITX_RESERVE_USD, NOTE_BURN_USD);
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
  const memo = memoFromParsed(parsed);
  return {
    ok: true,
    memo: memo || undefined,
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
  mintDeltas?: Record<string, number>;
  solDelta: number;
};

function memoFromParsed(parsed: ParsedTransactionWithMeta): string | null {
  const outer = (parsed.transaction.message.instructions || []) as Array<{
    programId?: PublicKey | string;
    program?: string;
    parsed?: unknown;
    data?: string;
  }>;
  const inner = (parsed.meta?.innerInstructions || []).flatMap((g) => g.instructions || []) as typeof outer;
  return extractMemoFromParsedParts({
    instructions: [...outer, ...inner],
    logs: parsed.meta?.logMessages,
  });
}

function mintDeltasForWallet(parsed: ParsedTransactionWithMeta, owner: string): Record<string, number> {
  const pre: Record<string, number> = {};
  const post: Record<string, number> = {};
  for (const b of parsed.meta?.preTokenBalances || []) {
    if (b.owner === owner && b.mint) pre[b.mint] = Number(b.uiTokenAmount?.uiAmount || 0);
  }
  for (const b of parsed.meta?.postTokenBalances || []) {
    if (b.owner === owner && b.mint) post[b.mint] = Number(b.uiTokenAmount?.uiAmount || 0);
  }
  const out: Record<string, number> = {};
  for (const mint of new Set([...Object.keys(pre), ...Object.keys(post)])) {
    out[mint] = (post[mint] || 0) - (pre[mint] || 0);
  }
  return out;
}

function orbitxDeltaForWallet(parsed: ParsedTransactionWithMeta, owner: string): number {
  return mintDeltasForWallet(parsed, owner)[ORBITX_MINT] || 0;
}

function solDeltaForWallet(parsed: ParsedTransactionWithMeta, owner: string): number {
  const keys = parsed.transaction.message.accountKeys || [];
  const idx = keys.findIndex((k) => k.pubkey.toBase58() === owner);
  if (idx < 0) return 0;
  const pre = Number(parsed.meta?.preBalances?.[idx] || 0);
  const post = Number(parsed.meta?.postBalances?.[idx] || 0);
  return (post - pre) / LAMPORTS_PER_SOL;
}

async function getParsedTx(conn: Connection, signature: string): Promise<ParsedTransactionWithMeta | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const parsed = await conn
      .getParsedTransaction(signature, { commitment: "confirmed", maxSupportedTransactionVersion: 0 })
      .catch(() => null);
    if (parsed) return parsed;
    if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 120 * (attempt + 1)));
  }
  return null;
}

export async function fetchServiceRawTxs(limit = 48): Promise<{ txs: RawServiceTx[]; requested: number; fetched: number }> {
  const conn = connection();
  const owner = servicePublicAddress();
  const sigs = await conn.getSignaturesForAddress(new PublicKey(owner), { limit: Math.min(80, Math.max(8, limit)) });
  const out: RawServiceTx[] = [];
  let fetched = 0;
  const chunk = 4;
  for (let i = 0; i < sigs.length; i += chunk) {
    const part = sigs.slice(i, i + chunk);
    const txs = await Promise.all(part.map((s) => getParsedTx(conn, s.signature)));
    for (let j = 0; j < part.length; j++) {
      const info = part[j];
      const parsed = txs[j];
      const blockTime = info.blockTime ? new Date(info.blockTime * 1000).toISOString() : null;
      if (!parsed) {
        out.push({
          signature: info.signature,
          slot: info.slot,
          blockTime,
          memo: null,
          orbitxDelta: 0,
          mintDeltas: {},
          solDelta: 0,
        });
        continue;
      }
      fetched += 1;
      out.push({
        signature: info.signature,
        slot: parsed.slot ?? info.slot,
        blockTime: parsed.blockTime ? new Date(parsed.blockTime * 1000).toISOString() : blockTime,
        memo: memoFromParsed(parsed),
        orbitxDelta: orbitxDeltaForWallet(parsed, owner),
        mintDeltas: mintDeltasForWallet(parsed, owner),
        solDelta: solDeltaForWallet(parsed, owner),
      });
    }
  }
  return { txs: out, requested: sigs.length, fetched };
}

export { SystemProgram };
