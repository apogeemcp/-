import { adminSecretConfigured } from "./admin-auth";
import {
  adminBurnOrbitx,
  getNoteBySignature,
  notesIndex,
  publicFeed,
  walletStatus,
  writeOnchainNote,
} from "./onchain-service";

export async function writeOnchainNoteTool(args: Record<string, unknown>) {
  const result = await writeOnchainNote({
    note: args.note || args.text || args.memo,
    idempotencyKey: args.idempotencyKey || args.id,
    source: "mcp",
    wallet: typeof args.wallet === "string" ? args.wallet : null,
  });
  if (!result.ok) return { ok: false, error: result.error };
  return {
    ok: true,
    noteId: result.note.id,
    memo: result.note.note,
    confirmation: result.note.memoStatus,
    transactionSignature: result.note.memoTx,
    solscanUrl: result.note.memoUrl,
    associatedBurnStatus: result.note.burnStatus,
    buyStatus: result.note.buyStatus,
    idempotent: result.idempotent,
  };
}

export async function getOnchainNoteTool(args: Record<string, unknown>) {
  const sig = String(args.signature || args.tx || args.transaction || "");
  if (sig.length < 32) return { ok: false, error: "Provide a Solana transaction signature." };
  return { ok: true, ...(await getNoteBySignature(sig)) };
}

export async function listOnchainNotesTool(args: Record<string, unknown>) {
  return notesIndex({
    wallet: args.wallet ? String(args.wallet) : undefined,
    search: args.search ? String(args.search) : undefined,
    limit: Number(args.limit || 20),
    offset: Number(args.offset || 0),
  });
}

export async function getOnchainActivityTool(args: Record<string, unknown>) {
  return publicFeed({
    type: args.eventType ? String(args.eventType) : args.type ? String(args.type) : "ALL",
    limit: Number(args.limit || 24),
    offset: Number(args.offset || 0),
  });
}

export async function getServiceWalletStatusTool() {
  const status = await walletStatus();
  return { ...status, privateKey: undefined };
}

export async function writeTokenSealTool(args: Record<string, unknown>) {
  const { writeTokenSeal } = await import("./onchain-seal-service");
  const result = await writeTokenSeal({
    token: args.token || args.mint || args.tokenMint,
    note: args.note || args.text || args.memo,
    imageBase64: args.imageBase64 || args.image,
    imageMime: args.imageMime || args.mime,
    usd: args.usd,
    source: "mcp",
    wallet: typeof args.wallet === "string" ? args.wallet : null,
  });
  if (!result.ok) return { ok: false, error: result.error };
  return {
    ok: true,
    sealId: result.seal.id,
    token: result.seal.tokenSymbol,
    tokenMint: result.seal.tokenMint,
    memo: result.seal.note,
    imageUrl: result.seal.imageUrl,
    nftMint: result.seal.nftMint || null,
    transactionSignature: result.seal.memoTx,
    solscanUrl: result.seal.memoUrl,
    buyStatus: result.seal.buyStatus,
    burnStatus: result.seal.burnStatus,
    buyTx: result.seal.buyTx,
    burnTx: result.seal.burnTx,
  };
}

export async function listTokenSealsTool(args: Record<string, unknown>) {
  const { listTokenSeals } = await import("./onchain-seal-service");
  return listTokenSeals(Number(args.limit || 20));
}

export async function listBurnTokensTool() {
  const { listBurnableTokens } = await import("./onchain-seal-service");
  return { ok: true, tokens: await listBurnableTokens(), maxBurnUsd: 0.25 };
}

export async function burnOrbitxTool(args: Record<string, unknown>) {
  const secret = process.env.APOGEE_ADMIN_SECRET?.trim();
  const given = String(args.adminSecret || args.secret || "");
  if (!adminSecretConfigured() || !secret || given !== secret) {
    return { ok: false, error: "burn_orbitx is admin-restricted." };
  }
  return adminBurnOrbitx(args.amount != null ? Number(args.amount) : undefined);
}
