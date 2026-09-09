import { PROJECT_CA } from "./site";
import { solanaRpcUrl, solscanMemoViews, solscanTxUrl } from "./solana-pay";

export const ORBITX_MINT = process.env.ORBITX_MINT?.trim() || PROJECT_CA;
export const MEMO_PROGRAM_ID = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";
export const MEMO_PREFIX = "ORBITX_NOTE:v1:";
export const NOTE_MAX_CHARS = 240;
export const NOTE_BURN_USD = 0.02;
export const WSOL_MINT = "So11111111111111111111111111111111111111112";
export const SOLANA_NETWORK = "mainnet-beta";

/** Public service wallet. Private key is only ORBITX_SERVICE_PRIVATE_KEY on the server. */
export const SERVICE_WALLET_PUBLIC = "2kYK8wfZt2A1BxsYQtGMdcZ3K3BovpFwZg5gWJ46HvEj";

export const EVENT_TYPES = [
  "MEMO_CREATED",
  "ORBITX_PURCHASE",
  "ORBITX_BURN",
  "TRANSACTION_CONFIRMED",
  "TRANSACTION_FAILED",
] as const;

export type OnchainEventType = (typeof EVENT_TYPES)[number];
export type OpStatus = "idle" | "pending" | "confirmed" | "failed";
export type ActivityStatus = "pending" | "confirmed" | "failed";

export function solanaRpc(): string {
  return solanaRpcUrl();
}

export function scanUrl(signature: string): string {
  return solscanTxUrl(signature);
}

export { solscanMemoViews };

function envBool(name: string): boolean | null {
  const raw = process.env[name]?.trim().toLowerCase();
  if (!raw) return null;
  if (["1", "true", "yes", "on"].includes(raw)) return true;
  if (["0", "false", "no", "off"].includes(raw)) return false;
  return null;
}

export function envNumber(name: string, fallback: number): number {
  const n = Number(process.env[name]?.trim());
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export function serviceSecretConfigured(): boolean {
  return Boolean(process.env.ORBITX_SERVICE_PRIVATE_KEY?.trim());
}

export function notesEnabledByEnv(): boolean | null {
  return envBool("ONCHAIN_NOTES_ENABLED");
}

export function autoBurnEnabledByEnv(): boolean | null {
  return envBool("AUTO_BURN_ENABLED");
}

export function defaultDailyBurnUsd(): number {
  return envNumber("MAX_DAILY_BURN_USD", 50);
}

export function defaultDailySolSpend(): number {
  return envNumber("MAX_DAILY_SOL_SPEND", 1);
}
