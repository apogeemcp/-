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

export async function burnOrbitxTool(args: Record<string, unknown>) {
  const secret = process.env.APOGEE_ADMIN_SECRET?.trim();
  const given = String(args.adminSecret || args.secret || "");
  if (!adminSecretConfigured() || !secret || given !== secret) {
    return { ok: false, error: "burn_orbitx is admin-restricted." };
  }
  return adminBurnOrbitx(args.amount != null ? Number(args.amount) : undefined);
}
