export type ScoreSignals = {
  age: number;
  athMcap: number;
  holderProfile: number;
  deployPattern: number;
  poolAge: number;
  authenticity: number;
};

export type ScanFlags = {
  tickerCollision: boolean;
  canonicalStock: boolean;
  lowLiquidity: boolean;
  extremePremium: boolean;
  unverifiedLookalike: boolean;
};

export type CompositeScore = {
  total: number;
  signals: ScoreSignals;
  verdict: string;
};

const MIN_LIQ = 1_000;

export function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

export function scoreAthMarketCap(athUsd: number): number {
  if (!Number.isFinite(athUsd) || athUsd <= 0) return 0;
  if (athUsd >= 1_000_000_000) return 100;
  if (athUsd >= 200_000_000) return 88;
  if (athUsd >= 50_000_000) return 72;
  if (athUsd >= 10_000_000) return 55;
  if (athUsd >= 1_000_000) return 35;
  if (athUsd >= 100_000) return 18;
  return 5;
}

export function scoreAgeDays(ageDays: number | null): number {
  if (ageDays == null || !Number.isFinite(ageDays)) return 20;
  if (ageDays >= 365) return 100;
  if (ageDays >= 180) return 85;
  if (ageDays >= 90) return 68;
  if (ageDays >= 30) return 50;
  if (ageDays >= 7) return 35;
  if (ageDays >= 1) return 22;
  return 12;
}

export function scoreHolderProfile(holderCount: number | null, topPct: number | null): number {
  const count = holderCount ?? 0;
  let countScore = 0;
  if (count >= 100_000) countScore = 60;
  else if (count >= 10_000) countScore = 48;
  else if (count >= 1_000) countScore = 36;
  else if (count >= 500) countScore = 28;
  else if (count >= 100) countScore = 18;
  else if (count > 0) countScore = 8;
  let distScore = 20;
  if (topPct != null) {
    if (topPct <= 15) distScore = 40;
    else if (topPct <= 25) distScore = 32;
    else if (topPct <= 40) distScore = 22;
    else if (topPct <= 55) distScore = 12;
    else distScore = 4;
  }
  return Math.min(100, countScore + distScore);
}

export function scoreAuthenticity(opts: {
  canonicalStock: boolean;
  collisionCount: number;
  liquidityUsd: number;
  verifiedName: boolean;
}): number {
  if (opts.canonicalStock) return 100;
  let score = 55;
  if (opts.verifiedName) score += 10;
  if (opts.collisionCount >= 3) score -= 35;
  else if (opts.collisionCount === 2) score -= 18;
  if (opts.liquidityUsd >= 250_000) score += 15;
  else if (opts.liquidityUsd < MIN_LIQ) score -= 20;
  return clamp(score, 0, 100);
}

export function scoreDeployPattern(opts: {
  canonicalStock: boolean;
  createdDays: number | null;
  hasWebsite: boolean;
}): number {
  if (opts.canonicalStock) return 100;
  let score = 48;
  if (opts.hasWebsite) score += 12;
  if (opts.createdDays != null && opts.createdDays < 1) score -= 18;
  if (opts.createdDays != null && opts.createdDays > 30) score += 12;
  return clamp(score, 0, 100);
}

export function verdictFor(total: number, flags: ScanFlags): string {
  if (flags.canonicalStock) return "CANONICAL STOCK TOKEN";
  if (flags.unverifiedLookalike) return "CAUTION — ticker collides with a canonical Stock Token";
  if (flags.lowLiquidity) return "WEAK — thin liquidity, easy to fake a chart";
  if (flags.extremePremium) return "REVIEW — DEX price is far from the oracle / RHJ quote";
  if (total >= 80) return "STRONG";
  if (total >= 60) return "LIKELY REAL";
  if (total >= 40) return "MIXED — verify the contract before size";
  return "WEAK / LIKELY LOOKALIKE";
}

export function computeApogeeScore(input: {
  canonicalStock: boolean;
  collisionCount: number;
  liquidityUsd: number;
  mcapUsd: number;
  ageDays: number | null;
  poolAgeDays: number | null;
  holderCount: number | null;
  topHoldersPct: number | null;
  hasWebsite: boolean;
  verifiedName: boolean;
  premiumBps: number | null;
}): { score: CompositeScore; flags: ScanFlags } {
  const flags: ScanFlags = {
    tickerCollision: input.collisionCount > 1,
    canonicalStock: input.canonicalStock,
    lowLiquidity: input.liquidityUsd < MIN_LIQ,
    extremePremium: input.premiumBps != null && Math.abs(input.premiumBps) >= 400,
    unverifiedLookalike: !input.canonicalStock && input.collisionCount > 1 && /stock|robinhood|tokenized/i.test(""),
  };
  flags.unverifiedLookalike = !input.canonicalStock && input.collisionCount > 1;

  const signals: ScoreSignals = {
    age: scoreAgeDays(input.ageDays),
    athMcap: scoreAthMarketCap(input.mcapUsd),
    holderProfile: scoreHolderProfile(input.holderCount, input.topHoldersPct),
    deployPattern: scoreDeployPattern({
      canonicalStock: input.canonicalStock,
      createdDays: input.ageDays,
      hasWebsite: input.hasWebsite,
    }),
    poolAge: scoreAgeDays(input.poolAgeDays),
    authenticity: scoreAuthenticity({
      canonicalStock: input.canonicalStock,
      collisionCount: input.collisionCount,
      liquidityUsd: input.liquidityUsd,
      verifiedName: input.verifiedName,
    }),
  };

  const raw =
    signals.authenticity * 0.32 +
    signals.athMcap * 0.22 +
    signals.holderProfile * 0.16 +
    signals.age * 0.14 +
    signals.deployPattern * 0.1 +
    signals.poolAge * 0.06;

  const penalty =
    (flags.unverifiedLookalike ? 18 : 0) +
    (flags.lowLiquidity ? 12 : 0) +
    (flags.extremePremium ? 8 : 0);

  const total = clamp(Math.round(raw - penalty), 0, 100);
  return {
    flags,
    score: {
      total,
      signals,
      verdict: verdictFor(total, flags),
    },
  };
}

export function momentumScore(pc24: number | null, buys: number | null, sells: number | null, volLiq: number | null): {
  momentum: number;
  label: string;
} {
  let mom = 50;
  if (pc24 != null && Number.isFinite(pc24)) mom += clamp(pc24 / 4, -25, 25);
  const b = buys ?? 0;
  const s = sells ?? 0;
  if (b + s > 0) {
    const br = b / (b + s);
    mom += br > 0.55 ? 8 : br < 0.45 ? -8 : 0;
  }
  if (volLiq != null && Number.isFinite(volLiq)) {
    mom += volLiq > 2 ? 6 : volLiq < 0.3 ? -6 : 0;
  }
  mom = Math.round(clamp(mom, 0, 100));
  const label = mom >= 75 ? "hot" : mom >= 55 ? "warming" : mom >= 40 ? "neutral" : mom >= 25 ? "cooling" : "cold";
  return { momentum: mom, label };
}
