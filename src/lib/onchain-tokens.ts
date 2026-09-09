import { ORBITX_MINT, SEAL_BURN_USD, SEAL_RESERVE_USD, ORBITX_RESERVE_USD } from "./onchain-config";

export type BurnableToken = {
  id: string;
  mint: string;
  symbol: string;
  name: string;
  burnUsd: number;
  reserveUsd: number;
};

export const BURNABLE_TOKENS: BurnableToken[] = [
  {
    id: "orbitx",
    mint: ORBITX_MINT,
    symbol: "$ORBITX",
    name: "OrbitX",
    burnUsd: SEAL_BURN_USD,
    reserveUsd: ORBITX_RESERVE_USD,
  },
  {
    id: "rokha",
    mint: "2jbdBWTK2MYpuRsmEDJqETU3UMM2nN3WGtete4HUpump",
    symbol: "$ROKHA",
    name: "Rokha",
    burnUsd: SEAL_BURN_USD,
    reserveUsd: SEAL_RESERVE_USD,
  },
];

const BY_MINT = new Map(BURNABLE_TOKENS.map((t) => [t.mint, t]));
const BY_ID = new Map(BURNABLE_TOKENS.map((t) => [t.id, t]));

export function isSolanaMint(value: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value);
}

export function resolveBurnableToken(input: unknown): BurnableToken | null {
  const raw = String(input || "").trim();
  if (!raw) return null;
  const lower = raw.toLowerCase();
  if (BY_ID.has(lower)) return BY_ID.get(lower) || null;
  const bySymbol = BURNABLE_TOKENS.find((t) => t.symbol.toLowerCase() === lower || t.symbol.toLowerCase() === `$${lower}`);
  if (bySymbol) return bySymbol;
  if (BY_MINT.has(raw)) return BY_MINT.get(raw) || null;
  return null;
}

export function supportedMints(): string[] {
  return BURNABLE_TOKENS.map((t) => t.mint);
}
