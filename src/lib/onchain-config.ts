import { PROJECT_CA } from "./site";
import { solanaRpcUrl, solscanMemoViews, solscanTxUrl } from "./solana-pay";

export const ORBITX_MINT = process.env.ORBITX_MINT?.trim() || PROJECT_CA;
export const MEMO_PROGRAM_ID = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";
export const MEMO_PREFIX = "ORBITX_NOTE:v1:";
export const NOTE_MAX_CHARS = 240;
/** USD of $ORBITX burned on each qualifying memo. */
export const NOTE_BURN_USD = 0.03;
/** Permanent $ORBITX float so the ATA stays open and later swaps skip rent. */
export const ORBITX_RESERVE_USD = 0.15;
/** Max USD the service wallet spends buying a supported token to burn on a seal. */
export const SEAL_BURN_USD = 0.25;
/** Small per-mint float so seal burns do not close the ATA. */
export const SEAL_RESERVE_USD = 0.05;
export const SEAL_PREFIX = "APOGEE_SEAL:v1:";
export const SEAL_NOTE_MAX = 180;
export const SEAL_IMAGE_MAX_BYTES = 350_000;
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

export function roundUsd(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}

/** SOL→$ORBITX swap size: top up the $0.15 float, then buy the $0.03 burn slice. */
export function orbitxBuyUsd(heldUsd: number): number {
  const gap = Math.max(0, ORBITX_RESERVE_USD - Math.max(0, heldUsd));
  return roundUsd(gap + NOTE_BURN_USD);
}

export function tokenBuyUsd(heldUsd: number, burnUsd: number, reserveUsd: number): number {
  const gap = Math.max(0, reserveUsd - Math.max(0, heldUsd));
  return roundUsd(gap + burnUsd);
}

export function tokenBurnUi(heldUi: number, priceUsd: number, burnUsd: number, reserveUsd: number): number {
  if (!(heldUi > 0) || !(priceUsd > 0)) return 0;
  const reserveUi = reserveUsd / priceUsd;
  const target = burnUsd / priceUsd;
  const spare = heldUi - reserveUi;
  if (spare <= 0) return 0;
  return Math.min(target, spare);
}

/** Burn only the $0.03 slice and never dip below the $0.15 float. */
export function orbitxBurnUi(heldUi: number, priceUsd: number): number {
  return tokenBurnUi(heldUi, priceUsd, NOTE_BURN_USD, ORBITX_RESERVE_USD);
}
