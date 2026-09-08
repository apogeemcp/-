/** Shared market-number validation. Rejects NaN, infinities, and impossible values. */

export function finiteNumber(value: unknown): number | null {
  const n = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : NaN;
  return Number.isFinite(n) ? n : null;
}

export function moneyField(
  value: unknown,
  opts: { allowNegative?: boolean; max?: number } = {},
): number | null {
  const n = finiteNumber(value);
  if (n == null) return null;
  if (!opts.allowNegative && n < 0) return null;
  if (opts.max != null && n > opts.max) return null;
  return n;
}

export type MarketFlags = {
  suspicious: boolean;
  flags: string[];
};

const ABSURD_USD = 1e15;

export function marketFlags(input: {
  priceUsd?: number | null;
  liquidityUsd?: number | null;
  volumeUsd?: number | null;
  supply?: number | null;
  mcapUsd?: number | null;
}): MarketFlags {
  const flags: string[] = [];
  if (input.priceUsd != null && input.priceUsd < 0) flags.push("negative-price");
  if (input.liquidityUsd != null && input.liquidityUsd < 0) flags.push("negative-liquidity");
  if (input.volumeUsd != null && input.volumeUsd < 0) flags.push("negative-volume");
  if (input.supply != null && input.supply < 0) flags.push("invalid-supply");
  if (input.mcapUsd != null && input.mcapUsd < 0) flags.push("negative-mcap");
  if (input.priceUsd != null && input.priceUsd > ABSURD_USD) flags.push("price-out-of-range");
  if (input.liquidityUsd != null && input.liquidityUsd > ABSURD_USD) flags.push("liquidity-out-of-range");
  if (input.mcapUsd != null && input.mcapUsd > ABSURD_USD) flags.push("mcap-out-of-range");
  if (
    input.priceUsd != null &&
    input.supply != null &&
    input.mcapUsd != null &&
    input.supply > 0 &&
    input.priceUsd > 0
  ) {
    const implied = input.priceUsd * input.supply;
    const ratio = implied > 0 ? input.mcapUsd / implied : 0;
    if (ratio > 20 || ratio < 0.05) flags.push("mcap-supply-mismatch");
  }
  return { suspicious: flags.length > 0, flags };
}

export function labelMarket(flags: MarketFlags, value: string): string {
  if (!flags.suspicious) return value;
  return `${value} (check)`;
}
