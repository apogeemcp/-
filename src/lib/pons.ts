import { CHAIN, TOKENS, isAddress } from "./chain";
import {
  callData,
  decodeString,
  decodeStringTupleAt,
  ipfsHttp,
  isZeroAddress,
  ratio,
  topicAddr,
  wordAddr,
  wordBig,
  wordBool,
  wordInt,
  bigintToDecimal,
} from "./abi";
import { erc20Meta, ethCall, rpc } from "./rpc";

export const PONS = {
  name: "pons",
  app: "https://www.ponsfamily.com/launchpad",
  docs: "https://docs.ponsfamily.com/",
  docsV2: "https://docs.ponsfamily.com/v2",
  chainId: CHAIN.id,
  poolFeeV1: 10_000,
  launchFeeEth: 0.0005,
  supply: 1_000_000_000,
  defaultGraduationEth: 4.2,
  v1: {
    activeFactory: "0xa5aab3f0c6eeadf30ef1d3eb997108e976351feb",
    activeLocker: "0x736d76699c26d0d966744cae304c000d471f7f35",
    activeStartBlock: 8_991_118,
    legacyFactory: "0x0c37a24f5d23a486fa692d1500881d698b1f77a4",
    legacyLocker: "0x31ca5e101941a93a7dd6d0497928700625cf54b5",
    legacyStartBlock: 8_600_612,
    v3Factory: "0x1f7d7550b1b028f7571e69a784071f0205fd2efa",
    positionManager: "0x73991a25c818bf1f1128deaab1492d45638de0d3",
    swapRouter: "0xcaf681a66d020601342297493863e78c959e5cb2",
    quoterV2: "0x33e885ed0ec9bf04ecfb19341582aadcb4c8a9e7",
    weth: TOKENS.WETH.toLowerCase(),
    tokenLaunchedTopic: "0xdb51ea9ad51ab453a65a4cb7e60c3cb378c9501bb002609f8f97778fb6c4235a",
    swapTopic: "0xc42079f94a6350d7e6235f29174924f928cc2ac818eb64fed8004e115fbcca67",
    currentSplit: { creatorPct: 70, protocolPct: 30, fromBlock: 8_991_118 },
    legacySplit: { creatorPct: 90, protocolPct: 10, fromBlock: 8_600_612 },
  },
  v2: {
    factory: "0x7ed598bcef8bd9edd8c97a195c6d13f40801ec7e",
    router: "0xe33e9e479df8802cb0866d5d05258bec4cf62948",
    feeEscrow: "0xd3afeb2a57f70ef218aa82451c51b2fb0416ac9e",
    memeHook: "0xe5e702641ea86f4ae6cc3cdaed2b886f976be044",
    buybackVault: "0x42df2a798f82289e177311362e8f5ccc45c1219c",
    locker: "0x267444d099b10fb5ed7c3cc7b7c767adca574952",
    tokenLaunchedTopic: "0x8d4aad4953d0ca700d468f3753aa14432d1b35b43ec6409f051fb6aa43a89607",
    poolGraduatedTopic: "0x085ee329dc7213d72bbe32eeb2a3f1604445dace6c113045e1e751463d9da414",
    launchSweptTopic: "0xcdb72f157fd3666758a6ce201387ffb52038c7562e4fff352828da1096c4b6b4",
    phases: ["NotGraduated", "Swept", "PoolCreated", "Rescued"] as const,
  },
  reference: {
    symbol: "PONS",
    token: "0x39dbed3a2bd333467115de45665cc57f813c4571",
    pool: "0x10cc6bd38112cac182db90b6a71d8bb5939526ba",
    launchTx: "0x1f54f25fec2d963dcb338ecb8b46a6eb123198a5c7a746d34cb2dbe78d074af8",
    factory: "legacy",
    generation: "v1" as const,
  },
  attribution:
    "Write pons in lowercase and link https://www.ponsfamily.com/launchpad. Apogee is not operated by pons and does not imply partnership.",
} as const;

const SEL = {
  getLaunchedToken: "0x3cf28b5a",
  graduationStatus: "0x98d652f1",
  locker: "0xd7b96d4e",
  logo: "0xfb7f21eb",
  description: "0x7284e416",
  liquidityPool: "0x665a11ca",
  socials: "0x53cd512a",
  slot0: "0x3850c7bd",
  tokenProtocolFeeShares: "0xf1c8f3c0",
  feeRedirects: "0xdce780c2",
  protocolFeeRecipient: "0x64df049e",
  getTokenInfo: "0xabb1dc44",
  getReserves: "0x0902f1ac",
  realQuoteReserve: "0x4f1f58fd",
  sellableTokens: "0x808bcddc",
  reservedTokens: "0x15a55347",
  readyToGraduate: "0xc68360a5",
  getLaunchFeePolicy: "0x470ef5fc",
  feeEscrow: "0xc4b7de97",
  buybackVault: "0xf1f5c993",
  launchFee: "0xcf3cf573",
} as const;

type CacheEntry<T> = { at: number; value: T };
const mem = new Map<string, CacheEntry<unknown>>();

function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = mem.get(key) as CacheEntry<T> | undefined;
  if (hit && Date.now() - hit.at < ttlMs) return Promise.resolve(hit.value);
  return fn().then((value) => {
    mem.set(key, { at: Date.now(), value });
    return value;
  });
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function mapPool<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const i = cursor++;
      out[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) || 1 }, () => worker()));
  return out;
}

export type RpcLog = {
  address?: string;
  topics?: string[];
  data?: string;
  blockNumber?: string;
  transactionHash?: string;
  logIndex?: string;
};

export type V1LaunchRecord = {
  token: string;
  deployer: string;
  pairedToken: string;
  positionManager: string;
  positionId: string;
  dexId: string;
  launchConfigId: string;
  restrictionsEndBlock: number;
  supply: string;
  isToken0: boolean;
  poolFee: number;
  exists: boolean;
  initialBuyAmount: string;
};

export type V2LaunchRecord = {
  token: string;
  curve: string;
  deployer: string;
  creatorFeeRecipient: string;
  pairToken: string;
  graduationThreshold: string;
  poolFee: number;
  tickSpacing: number;
  creatorTaxBps: number;
  buybackEnabled: boolean;
  phase: number;
  phaseLabel: string;
  sweptQuote: string;
  sweptTokens: string;
  sweptAt: number;
  exists: boolean;
};

export function decodeV1TokenLaunched(log: RpcLog) {
  const topics = log.topics || [];
  const data = log.data || "0x";
  return {
    token: topicAddr(topics[1] || ""),
    deployer: topicAddr(topics[2] || ""),
    dexFactory: topicAddr(topics[3] || ""),
    pairToken: wordAddr(data, 0),
    pool: wordAddr(data, 1),
    dexId: wordBig(data, 2).toString(),
    launchConfigId: wordBig(data, 3).toString(),
    positionId: wordBig(data, 4).toString(),
    restrictionsEndBlock: Number(wordBig(data, 5)),
    initialBuyAmount: wordBig(data, 6).toString(),
    blockNumber: log.blockNumber ? Number(BigInt(log.blockNumber)) : null,
    txHash: log.transactionHash || null,
  };
}

export function decodeV2TokenLaunched(log: RpcLog) {
  const topics = log.topics || [];
  const data = log.data || "0x";
  return {
    token: topicAddr(topics[1] || ""),
    curve: topicAddr(topics[2] || ""),
    deployer: topicAddr(topics[3] || ""),
    pairToken: wordAddr(data, 0),
    launchConfigId: wordBig(data, 1).toString(),
    graduationThreshold: wordBig(data, 2).toString(),
    blockNumber: log.blockNumber ? Number(BigInt(log.blockNumber)) : null,
    txHash: log.transactionHash || null,
  };
}

export function decodeV1LaunchedToken(hex: string): V1LaunchRecord {
  return {
    token: wordAddr(hex, 0),
    deployer: wordAddr(hex, 1),
    pairedToken: wordAddr(hex, 2),
    positionManager: wordAddr(hex, 3),
    positionId: wordBig(hex, 4).toString(),
    dexId: wordBig(hex, 5).toString(),
    launchConfigId: wordBig(hex, 6).toString(),
    restrictionsEndBlock: Number(wordBig(hex, 7)),
    supply: wordBig(hex, 8).toString(),
    isToken0: wordBool(hex, 9),
    poolFee: Number(wordBig(hex, 10)),
    exists: wordBool(hex, 11),
    initialBuyAmount: wordBig(hex, 12).toString(),
  };
}

export function decodeV2LaunchedToken(hex: string): V2LaunchRecord {
  const phase = Number(wordBig(hex, 10));
  return {
    token: wordAddr(hex, 0),
    curve: wordAddr(hex, 1),
    deployer: wordAddr(hex, 2),
    creatorFeeRecipient: wordAddr(hex, 3),
    pairToken: wordAddr(hex, 4),
    graduationThreshold: wordBig(hex, 5).toString(),
    poolFee: Number(wordBig(hex, 6)),
    tickSpacing: wordInt(hex, 7, 24),
    creatorTaxBps: Number(wordBig(hex, 8)),
    buybackEnabled: wordBool(hex, 9),
    phase,
    phaseLabel: PONS.v2.phases[phase] || `phase_${phase}`,
    sweptQuote: wordBig(hex, 11).toString(),
    sweptTokens: wordBig(hex, 12).toString(),
    sweptAt: Number(wordBig(hex, 13)),
    exists: wordBool(hex, 14),
  };
}

export function decodeGraduation(hex: string) {
  const pairedPrincipal = wordBig(hex, 0);
  const threshold = wordBig(hex, 1);
  const graduated = wordBool(hex, 2);
  return {
    pairedPrincipal: pairedPrincipal.toString(),
    pairedPrincipalEth: bigintToDecimal(pairedPrincipal),
    threshold: threshold.toString(),
    thresholdEth: bigintToDecimal(threshold),
    graduated,
    progress: progressFrom(pairedPrincipal, threshold),
  };
}

export function progressFrom(principal: bigint, threshold: bigint): number {
  if (threshold === 0n) return 0;
  const p = ratio(principal, threshold) || 0;
  return Math.max(0, Math.min(p, 1));
}

export function quoteLabel(pairToken: string): "ETH" | "WETH" | "ERC20" {
  if (isZeroAddress(pairToken)) return "ETH";
  if (pairToken.toLowerCase() === PONS.v1.weth) return "WETH";
  return "ERC20";
}

function decodeSocialsHex(hex: string) {
  if (!hex || hex === "0x") return { twitter: "", telegram: "", discord: "", website: "", farcaster: "" };
  const [twitter, telegram, discord, website, farcaster] = [
    decodeString(hex, 0),
    decodeString(hex, 1),
    decodeString(hex, 2),
    decodeString(hex, 3),
    decodeString(hex, 4),
  ];
  return { twitter, telegram, discord, website, farcaster };
}

function decodeGetTokenInfo(hex: string) {
  const deployer = wordAddr(hex, 0);
  const logo = decodeString(hex, 1);
  const description = decodeString(hex, 2);
  const socialsAbs = Number(wordBig(hex, 3));
  const [twitter, telegram, discord, website, farcaster] = decodeStringTupleAt(hex, socialsAbs, 5);
  return { deployer, logo, description, socials: { twitter, telegram, discord, website, farcaster } };
}

async function callSafe(to: string, data: string): Promise<string | null> {
  try {
    const hex = await ethCall(to, data);
    if (!hex || hex === "0x") return null;
    return hex;
  } catch {
    return null;
  }
}

async function getLogsChunked(params: {
  address: string;
  topics: string[];
  fromBlock: number;
  toBlock: number;
  chunk?: number;
}): Promise<RpcLog[]> {
  const chunk = params.chunk ?? 6_000;
  const out: RpcLog[] = [];
  for (let start = params.toBlock; start >= params.fromBlock; ) {
    const from = Math.max(params.fromBlock, start - chunk + 1);
    let attempt = 0;
    while (attempt < 4) {
      try {
        const logs = await rpc<RpcLog[]>("eth_getLogs", [
          {
            address: params.address,
            fromBlock: "0x" + from.toString(16),
            toBlock: "0x" + start.toString(16),
            topics: params.topics,
          },
        ]);
        out.push(...(logs || []));
        break;
      } catch (error) {
        attempt += 1;
        const msg = error instanceof Error ? error.message : String(error);
        if (!/429|Too Many|timeout|rate/i.test(msg) || attempt >= 4) {
          // Shrink the window and continue rather than aborting the whole backfill.
          if (chunk > 1_500 && start - from + 1 > 1_500) {
            const mid = Math.floor((from + start) / 2);
            const left = await getLogsChunked({ ...params, fromBlock: from, toBlock: mid, chunk: Math.floor(chunk / 2) });
            const right = await getLogsChunked({
              ...params,
              fromBlock: mid + 1,
              toBlock: start,
              chunk: Math.floor(chunk / 2),
            });
            out.push(...left, ...right);
            break;
          }
          break;
        }
        await sleep(400 * 2 ** (attempt - 1));
      }
    }
    start = from - 1;
  }
  return out;
}

async function latestBlockNumber(): Promise<number> {
  const hex = await rpc<string>("eth_blockNumber");
  return Number(BigInt(hex));
}

export async function ethUsd(): Promise<number | null> {
  return cached("eth-usd", 60_000, async () => {
    try {
      const res = await fetch("https://coins.llama.fi/prices/current/coingecko:ethereum");
      const json = (await res.json()) as { coins?: { [k: string]: { price?: number } } };
      return json.coins?.["coingecko:ethereum"]?.price ?? null;
    } catch {
      return null;
    }
  });
}

async function readV1Record(factory: string, token: string): Promise<V1LaunchRecord | null> {
  const hex = await callSafe(factory, callData(SEL.getLaunchedToken, token));
  if (!hex) return null;
  const rec = decodeV1LaunchedToken(hex);
  return rec.exists ? rec : null;
}

async function readV2Record(token: string): Promise<V2LaunchRecord | null> {
  const hex = await callSafe(PONS.v2.factory, callData(SEL.getLaunchedToken, token));
  if (!hex) return null;
  const rec = decodeV2LaunchedToken(hex);
  return rec.exists ? rec : null;
}

async function v1Meta(token: string) {
  const [logoHex, descHex, poolHex, socialsHex, erc] = await Promise.all([
    callSafe(token, SEL.logo),
    callSafe(token, SEL.description),
    callSafe(token, SEL.liquidityPool),
    callSafe(token, SEL.socials),
    erc20Meta(token).catch(() => ({ name: null, symbol: null, decimals: 18, totalSupply: null })),
  ]);
  return {
    ...erc,
    logo: ipfsHttp(logoHex ? decodeString(logoHex, 0) : null),
    description: descHex ? decodeString(descHex, 0) : null,
    pool: poolHex ? wordAddr(poolHex, 0) : null,
    socials: socialsHex ? decodeSocialsHex(socialsHex) : null,
  };
}

async function v2Meta(token: string) {
  const [infoHex, erc] = await Promise.all([
    callSafe(token, SEL.getTokenInfo),
    erc20Meta(token).catch(() => ({ name: null, symbol: null, decimals: 18, totalSupply: null })),
  ]);
  const info = infoHex ? decodeGetTokenInfo(infoHex) : null;
  return {
    ...erc,
    logo: ipfsHttp(info?.logo || null),
    description: info?.description || null,
    socials: info?.socials || null,
    tokenDeployer: info?.deployer || null,
  };
}

async function v1Graduation(factory: string, token: string) {
  const hex = await callSafe(factory, callData(SEL.graduationStatus, token));
  return hex ? decodeGraduation(hex) : null;
}

async function v1Fees(factory: string, token: string, deployer: string) {
  const lockerHex = await callSafe(factory, SEL.locker);
  const locker = lockerHex ? wordAddr(lockerHex, 0) : null;
  if (!locker || isZeroAddress(locker)) return null;
  const [shareHex, redirectHex, protoHex] = await Promise.all([
    callSafe(locker, callData(SEL.tokenProtocolFeeShares, token)),
    callSafe(locker, callData(SEL.feeRedirects, token)),
    callSafe(locker, SEL.protocolFeeRecipient),
  ]);
  const protocolShare = shareHex ? Number(wordBig(shareHex, 0)) : null;
  const redirect = redirectHex ? wordAddr(redirectHex, 0) : null;
  return {
    locker,
    protocolSharePct: protocolShare,
    creatorSharePct: protocolShare == null ? null : 100 - protocolShare,
    creatorPayout: redirect && !isZeroAddress(redirect) ? redirect : deployer,
    protocolFeeRecipient: protoHex ? wordAddr(protoHex, 0) : null,
  };
}

async function v1Price(pool: string, isToken0: boolean, ethPrice: number | null) {
  const hex = await callSafe(pool, SEL.slot0);
  if (!hex) return null;
  const sqrt = wordBig(hex, 0);
  const q192 = 2n ** 192n;
  const token1PerToken0 = ratio(sqrt * sqrt, q192);
  if (token1PerToken0 == null || !Number.isFinite(token1PerToken0) || token1PerToken0 <= 0) return null;
  const priceInWeth = isToken0 ? token1PerToken0 : 1 / token1PerToken0;
  return {
    sqrtPriceX96: sqrt.toString(),
    priceInWeth,
    priceUsd: ethPrice != null ? priceInWeth * ethPrice : null,
  };
}

async function v2Curve(curve: string, thresholdWei: bigint, ethPrice: number | null, pairIsEth: boolean) {
  const [reservesHex, realHex, sellableHex, reservedHex, readyHex] = await Promise.all([
    callSafe(curve, SEL.getReserves),
    callSafe(curve, SEL.realQuoteReserve),
    callSafe(curve, SEL.sellableTokens),
    callSafe(curve, SEL.reservedTokens),
    callSafe(curve, SEL.readyToGraduate),
  ]);
  if (!reservesHex) return null;
  const quoteReserve = wordBig(reservesHex, 0);
  const tokenReserve = wordBig(reservesHex, 1);
  const realQuote = realHex ? wordBig(realHex, 0) : 0n;
  const priceInQuote = ratio(quoteReserve, tokenReserve);
  return {
    curve,
    quoteReserve: quoteReserve.toString(),
    tokenReserve: tokenReserve.toString(),
    realQuoteReserve: realQuote.toString(),
    realQuoteEth: bigintToDecimal(realQuote),
    sellableTokens: sellableHex ? wordBig(sellableHex, 0).toString() : null,
    reservedTokens: reservedHex ? wordBig(reservedHex, 0).toString() : null,
    readyToGraduate: readyHex ? wordBool(readyHex, 0) : false,
    progress: progressFrom(realQuote, thresholdWei),
    priceInQuote,
    priceUsd: pairIsEth && priceInQuote != null && ethPrice != null ? priceInQuote * ethPrice : null,
  };
}

async function v2Policy(token: string) {
  const hex = await callSafe(PONS.v2.factory, callData(SEL.getLaunchFeePolicy, token));
  if (!hex) return null;
  return {
    protocolFeeRecipient: wordAddr(hex, 0),
    protocolFeeShareBps: Number(wordBig(hex, 1)),
    buybackBurnBps: Number(wordBig(hex, 2)),
    hookFeeBps: Number(wordBig(hex, 3)),
    maxInternalPriceImpactBps: Number(wordBig(hex, 4)),
  };
}

export async function resolvePons(token: string) {
  const addr = token.trim();
  if (!isAddress(addr)) return { ok: false as const, error: "Provide a token address." };
  const [v2, v1a, v1l] = await Promise.all([
    readV2Record(addr),
    readV1Record(PONS.v1.activeFactory, addr),
    readV1Record(PONS.v1.legacyFactory, addr),
  ]);
  if (v2) {
    return {
      ok: true as const,
      generation: "v2" as const,
      factory: PONS.v2.factory,
      v2,
      v1: null,
      factoryKind: "v2" as const,
    };
  }
  if (v1a) {
    return {
      ok: true as const,
      generation: "v1" as const,
      factory: PONS.v1.activeFactory,
      v1: v1a,
      v2: null,
      factoryKind: "active" as const,
    };
  }
  if (v1l) {
    return {
      ok: true as const,
      generation: "v1" as const,
      factory: PONS.v1.legacyFactory,
      v1: v1l,
      v2: null,
      factoryKind: "legacy" as const,
    };
  }
  return { ok: false as const, error: "Not a pons launch token." };
}

export async function getPonsToken(address: string) {
  const resolved = await resolvePons(address);
  if (!resolved.ok) return resolved;
  const ethPrice = await ethUsd();
  if (resolved.generation === "v2" && resolved.v2) {
    const rec = resolved.v2;
    const pairIsEth = isZeroAddress(rec.pairToken);
    const [meta, curve, policy] = await Promise.all([
      v2Meta(rec.token),
      v2Curve(rec.curve, BigInt(rec.graduationThreshold), ethPrice, pairIsEth),
      v2Policy(rec.token),
    ]);
    const graduated = rec.phase >= 2;
    const progress = graduated ? 1 : curve?.progress ?? 0;
    const supplyTokens = meta.totalSupply ? Number(meta.totalSupply) : PONS.supply;
    const priceUsd = curve?.priceUsd ?? null;
    return {
      ok: true,
      source: "pons",
      generation: "v2",
      venue: rec.phase >= 2 ? "uniswap_v4" : "bonding_curve",
      token: rec.token,
      meta,
      launch: rec,
      quote: quoteLabel(rec.pairToken),
      curve,
      feePolicy: policy,
      graduation: {
        graduated,
        phase: rec.phaseLabel,
        progress,
        threshold: rec.graduationThreshold,
        thresholdEth: bigintToDecimal(BigInt(rec.graduationThreshold)),
        note: "Graduation means the curve sold out. It is not a quality signal.",
      },
      priceUsd,
      marketCapUsd: priceUsd != null && supplyTokens ? priceUsd * supplyTokens : null,
      links: {
        pons: `${PONS.app}`,
        docs: PONS.docsV2,
        explorer: `${CHAIN.explorer}/token/${rec.token}`,
      },
      attribution: PONS.attribution,
    };
  }
  const rec = resolved.v1!;
  const [meta, graduation, fees, price] = await Promise.all([
    v1Meta(rec.token),
    v1Graduation(resolved.factory, rec.token),
    v1Fees(resolved.factory, rec.token, rec.deployer),
    metaPoolPrice(rec, ethPrice),
  ]);
  const pool = meta.pool;
  const supplyTokens = meta.totalSupply ? Number(meta.totalSupply) : PONS.supply;
  const priceUsd = price?.priceUsd ?? null;
  return {
    ok: true,
    source: "pons",
    generation: "v1",
    factoryKind: resolved.factoryKind,
    venue: "uniswap_v3",
    token: rec.token,
    meta: { ...meta, pool },
    launch: rec,
    quote: quoteLabel(rec.pairedToken),
    fees,
    graduation: {
      ...(graduation || {}),
      note: "Graduation confirms paired WETH reached the threshold. Trading stays in the same pool. Not a quality signal.",
    },
    price,
    priceUsd,
    marketCapUsd: priceUsd != null && supplyTokens ? priceUsd * supplyTokens : null,
    links: {
      pons: PONS.app,
      docs: PONS.docs,
      explorer: `${CHAIN.explorer}/token/${rec.token}`,
      pool: pool ? `${CHAIN.explorer}/address/${pool}` : null,
    },
    attribution: PONS.attribution,
  };
}

async function metaPoolPrice(rec: V1LaunchRecord, ethPrice: number | null) {
  const poolHex = await callSafe(rec.token, SEL.liquidityPool);
  const pool = poolHex ? wordAddr(poolHex, 0) : null;
  if (!pool || isZeroAddress(pool)) return null;
  return v1Price(pool, rec.isToken0, ethPrice);
}

export async function getPonsGraduation(address: string) {
  const detail = await getPonsToken(address);
  if (!("ok" in detail) || !detail.ok) return detail;
  return {
    ok: true,
    token: detail.token,
    generation: detail.generation,
    graduation: detail.graduation,
    priceUsd: detail.priceUsd,
    attribution: PONS.attribution,
  };
}

export async function getPonsProtocol() {
  const [block, ethPrice, launchFeeHex] = await Promise.all([
    latestBlockNumber().catch(() => 0),
    ethUsd(),
    callSafe(PONS.v2.factory, SEL.launchFee),
  ]);
  return {
    ok: true,
    name: "pons",
    chain: { id: CHAIN.id, name: CHAIN.name, rpc: CHAIN.rpc, explorer: CHAIN.explorer },
    app: PONS.app,
    docs: PONS.docs,
    docsV2: PONS.docsV2,
    facts: {
      v1: {
        venue: "Uniswap V3 vs WETH only",
        poolFee: PONS.poolFeeV1,
        launchFeeEth: PONS.launchFeeEth,
        supply: PONS.supply,
        graduationDefaultEth: PONS.defaultGraduationEth,
        protection: "First 2 blocks: launch block creator-only; then max 5% hold / 5.5% buy per wallet",
        noBondingCurve: true,
        noMigration: true,
        feeSplit: { current: PONS.v1.currentSplit, legacy: PONS.v1.legacySplit },
      },
      v2: {
        venue: "Bonding curve → Uniswap V4 (locked)",
        pairAssets: "ETH (zero address) or approved ERC-20 including Stock Tokens",
        phases: PONS.v2.phases,
        note: "phase 0 trades on the curve; phase 2 trades on the locked v4 pool. Graduation is not a quality signal.",
      },
    },
    contracts: {
      v1: PONS.v1,
      v2: PONS.v2,
      weth: TOKENS.WETH,
    },
    reference: PONS.reference,
    live: {
      block,
      ethUsd: ethPrice,
      v2LaunchFeeWei: launchFeeHex ? wordBig(launchFeeHex, 0).toString() : null,
    },
    events: {
      v1TokenLaunched: PONS.v1.tokenLaunchedTopic,
      v2TokenLaunched: PONS.v2.tokenLaunchedTopic,
      v3Swap: PONS.v1.swapTopic,
    },
    attribution: PONS.attribution,
  };
}

type LaunchSummary = {
  generation: "v1" | "v2";
  token: string;
  deployer: string;
  pairToken: string;
  quote: "ETH" | "WETH" | "ERC20";
  blockNumber: number | null;
  txHash: string | null;
  curve?: string;
  pool?: string;
  name?: string | null;
  symbol?: string | null;
  logo?: string | null;
  graduated?: boolean | null;
  progress?: number | null;
  phase?: string;
  priceUsd?: number | null;
  thresholdEth?: number | null;
};

async function enrichV2(row: ReturnType<typeof decodeV2TokenLaunched>): Promise<LaunchSummary> {
  const [meta, rec] = await Promise.all([v2Meta(row.token).catch(() => null), readV2Record(row.token)]);
  const ethPrice = await ethUsd();
  const threshold = BigInt(row.graduationThreshold || rec?.graduationThreshold || "0");
  const pair = rec?.pairToken || row.pairToken;
  const pairIsEth = isZeroAddress(pair);
  const curve = rec && rec.phase < 2 ? await v2Curve(rec.curve, threshold, ethPrice, pairIsEth) : null;
  const graduated = (rec?.phase || 0) >= 2;
  return {
    generation: "v2",
    token: row.token,
    deployer: row.deployer,
    pairToken: pair,
    quote: quoteLabel(pair),
    blockNumber: row.blockNumber,
    txHash: row.txHash,
    curve: row.curve,
    name: meta?.name || null,
    symbol: meta?.symbol || null,
    logo: meta?.logo || null,
    graduated,
    progress: graduated ? 1 : curve?.progress ?? null,
    phase: rec?.phaseLabel,
    priceUsd: curve?.priceUsd ?? null,
    thresholdEth: threshold ? bigintToDecimal(threshold) : PONS.defaultGraduationEth,
  };
}

async function enrichV1(row: ReturnType<typeof decodeV1TokenLaunched>, factory: string): Promise<LaunchSummary> {
  const [meta, grad] = await Promise.all([v1Meta(row.token).catch(() => null), v1Graduation(factory, row.token)]);
  return {
    generation: "v1",
    token: row.token,
    deployer: row.deployer,
    pairToken: row.pairToken,
    quote: quoteLabel(row.pairToken),
    blockNumber: row.blockNumber,
    txHash: row.txHash,
    pool: row.pool,
    name: meta?.name || null,
    symbol: meta?.symbol || null,
    logo: meta?.logo || null,
    graduated: grad?.graduated ?? null,
    progress: grad?.progress ?? null,
    phase: grad?.graduated ? "Graduated" : "Trading",
    thresholdEth: grad?.thresholdEth ?? PONS.defaultGraduationEth,
  };
}

export async function listPonsLaunches(opts: { limit?: number; lookback?: number; generation?: string } = {}) {
  const limit = Math.min(Math.max(Number(opts.limit) || 24, 1), 80);
  const lookback = Math.min(Math.max(Number(opts.lookback) || 8_000, 500), 80_000);
  const generation = String(opts.generation || "all").toLowerCase();
  return cached(`pons-launches:${generation}:${limit}:${lookback}`, 20_000, async () => {
    const latest = await latestBlockNumber();
    const from = Math.max(0, latest - lookback);
    const wantV2 = generation === "all" || generation === "v2";
    const wantV1 = generation === "all" || generation === "v1";
    const [v2logs, v1a, v1l] = await Promise.all([
      wantV2
        ? getLogsChunked({
            address: PONS.v2.factory,
            topics: [PONS.v2.tokenLaunchedTopic],
            fromBlock: from,
            toBlock: latest,
            chunk: 10_000,
          })
        : Promise.resolve([] as RpcLog[]),
      wantV1
        ? getLogsChunked({
            address: PONS.v1.activeFactory,
            topics: [PONS.v1.tokenLaunchedTopic],
            fromBlock: Math.max(PONS.v1.activeStartBlock, from),
            toBlock: latest,
            chunk: 4_000,
          }).catch(() => [] as RpcLog[])
        : Promise.resolve([] as RpcLog[]),
      wantV1
        ? getLogsChunked({
            address: PONS.v1.legacyFactory,
            topics: [PONS.v1.tokenLaunchedTopic],
            fromBlock: Math.max(PONS.v1.legacyStartBlock, from),
            toBlock: latest,
            chunk: 4_000,
          }).catch(() => [] as RpcLog[])
        : Promise.resolve([] as RpcLog[]),
    ]);
    const v2rows = v2logs.map(decodeV2TokenLaunched).sort((a, b) => (b.blockNumber || 0) - (a.blockNumber || 0));
    const v1rows = [
      ...v1a.map((l) => ({ ...decodeV1TokenLaunched(l), factory: PONS.v1.activeFactory })),
      ...v1l.map((l) => ({ ...decodeV1TokenLaunched(l), factory: PONS.v1.legacyFactory })),
    ].sort((a, b) => (b.blockNumber || 0) - (a.blockNumber || 0));

    const merged: Array<{ kind: "v2"; row: ReturnType<typeof decodeV2TokenLaunched> } | { kind: "v1"; row: (typeof v1rows)[number] }> = [
      ...v2rows.map((row) => ({ kind: "v2" as const, row })),
      ...v1rows.map((row) => ({ kind: "v1" as const, row })),
    ].sort((a, b) => (b.row.blockNumber || 0) - (a.row.blockNumber || 0));

    const slice = merged.slice(0, limit);
    const launches = await mapPool(slice, 6, async (item) => {
      if (item.kind === "v2") return enrichV2(item.row);
      return enrichV1(item.row, item.row.factory);
    });

    return {
      ok: true,
      source: "pons",
      lookbackBlocks: lookback,
      latestBlock: latest,
      counted: { v2: v2rows.length, v1: v1rows.length },
      launches,
      app: PONS.app,
      attribution: PONS.attribution,
    };
  });
}
