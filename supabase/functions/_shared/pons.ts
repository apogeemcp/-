const CHAIN_ID = 4663;
const RPC = Deno.env.get("APOGEE_RPC_URL") || "https://rpc.mainnet.chain.robinhood.com";
const WETH = "0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73";
const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
const isAddress = (v: string) => ADDRESS_RE.test(v.trim());

async function fetchJson<T>(url: string, ms = 12000): Promise<T | null> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    const res = await fetch(url, { signal: ctl.signal, headers: { accept: "application/json" } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

export const PONS_APP = "https://www.ponsfamily.com/launchpad";
export const PONS_DOCS = "https://docs.ponsfamily.com/";
const ATTR =
  "Write pons in lowercase and link https://www.ponsfamily.com/launchpad. Apogee is not operated by pons and does not imply partnership.";

const V1_ACTIVE = "0xa5aab3f0c6eeadf30ef1d3eb997108e976351feb";
const V1_LEGACY = "0x0c37a24f5d23a486fa692d1500881d698b1f77a4";
const V2_FACTORY = "0x7ed598bcef8bd9edd8c97a195c6d13f40801ec7e";
const V1_TOPIC = "0xdb51ea9ad51ab453a65a4cb7e60c3cb378c9501bb002609f8f97778fb6c4235a";
const V2_TOPIC = "0x8d4aad4953d0ca700d468f3753aa14432d1b35b43ec6409f051fb6aa43a89607";
const SEL = {
  getLaunchedToken: "0x3cf28b5a",
  graduationStatus: "0x98d652f1",
  logo: "0xfb7f21eb",
  description: "0x7284e416",
  liquidityPool: "0x665a11ca",
  socials: "0x53cd512a",
  slot0: "0x3850c7bd",
  getTokenInfo: "0xabb1dc44",
  getReserves: "0x0902f1ac",
  realQuoteReserve: "0x4f1f58fd",
  name: "0x06fdde03",
  symbol: "0x95d89b41",
};

const PHASES = ["NotGraduated", "Swept", "PoolCreated", "Rescued"];

function strip(h: string) {
  return h.replace(/^0x/i, "");
}
function word(h: string, i: number) {
  return strip(h).slice(i * 64, i * 64 + 64);
}
function wordBig(h: string, i: number) {
  const w = word(h, i);
  return w ? BigInt("0x" + w) : 0n;
}
function wordAddr(h: string, i: number) {
  return ("0x" + word(h, i).slice(24)).toLowerCase();
}
function wordBool(h: string, i: number) {
  return wordBig(h, i) !== 0n;
}
function topicAddr(t: string) {
  return ("0x" + strip(t).slice(24)).toLowerCase();
}
function callData(sel: string, addr?: string) {
  const s = sel.replace(/^0x/i, "");
  if (!addr) return "0x" + s;
  return "0x" + s + addr.replace(/^0x/i, "").toLowerCase().padStart(64, "0");
}
function isZero(a: string) {
  return /^0x0{40}$/i.test(a);
}
function utf8(hexChars: string) {
  const bytes = new Uint8Array((hexChars.match(/.{2}/g) || []).map((b) => parseInt(b, 16)));
  return new TextDecoder().decode(bytes).replace(/\u0000/g, "").trim();
}
function decodeString(hex: string, head: number) {
  const abs = Number(wordBig(hex, head));
  const h = strip(hex);
  const start = abs * 2;
  const len = Number.parseInt(h.slice(start, start + 64), 16);
  if (!len) return "";
  return utf8(h.slice(start + 64, start + 64 + len * 2));
}
function ipfsHttp(uri: string | null) {
  if (!uri) return null;
  return uri.startsWith("ipfs://") ? `https://ipfs.io/ipfs/${uri.slice(7)}` : uri;
}
function progress(n: bigint, d: bigint) {
  if (d === 0n) return 0;
  const p = Number((n * 10n ** 18n) / d) / 1e18;
  return Math.max(0, Math.min(p, 1));
}
function toEth(v: bigint) {
  return Number(v) / 1e18;
}

async function rpc<T>(method: string, params: unknown[] = []): Promise<T> {
  const res = await fetch(RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const body = await res.json();
  if (body.error) throw new Error(body.error.message);
  return body.result as T;
}

async function callSafe(to: string, data: string) {
  try {
    const hex = await rpc<string>("eth_call", [{ to, data }, "latest"]);
    return !hex || hex === "0x" ? null : hex;
  } catch {
    return null;
  }
}

async function ethUsd() {
  const j = await fetchJson<{ coins?: Record<string, { price?: number }> }>(
    "https://coins.llama.fi/prices/current/coingecko:ethereum",
  );
  return j?.coins?.["coingecko:ethereum"]?.price ?? null;
}

function decodeV2(hex: string) {
  const phase = Number(wordBig(hex, 10));
  return {
    token: wordAddr(hex, 0),
    curve: wordAddr(hex, 1),
    deployer: wordAddr(hex, 2),
    creatorFeeRecipient: wordAddr(hex, 3),
    pairToken: wordAddr(hex, 4),
    graduationThreshold: wordBig(hex, 5).toString(),
    poolFee: Number(wordBig(hex, 6)),
    tickSpacing: Number(wordBig(hex, 7)),
    creatorTaxBps: Number(wordBig(hex, 8)),
    buybackEnabled: wordBool(hex, 9),
    phase,
    phaseLabel: PHASES[phase] || String(phase),
    exists: wordBool(hex, 14),
  };
}

function decodeV1(hex: string) {
  return {
    token: wordAddr(hex, 0),
    deployer: wordAddr(hex, 1),
    pairedToken: wordAddr(hex, 2),
    isToken0: wordBool(hex, 9),
    poolFee: Number(wordBig(hex, 10)),
    exists: wordBool(hex, 11),
    supply: wordBig(hex, 8).toString(),
  };
}

export async function ponsProtocol() {
  const block = await rpc<string>("eth_blockNumber").catch(() => "0x0");
  return {
    ok: true,
    name: "pons",
    chain: { id: CHAIN_ID, rpc: RPC },
    app: PONS_APP,
    docs: PONS_DOCS,
    contracts: {
      v1ActiveFactory: V1_ACTIVE,
      v1LegacyFactory: V1_LEGACY,
      v2Factory: V2_FACTORY,
      weth: WETH,
    },
    reference: {
      token: "0x39dbed3a2bd333467115de45665cc57f813c4571",
      pool: "0x10cc6bd38112cac182db90b6a71d8bb5939526ba",
    },
    live: { block: Number(BigInt(block)), ethUsd: await ethUsd() },
    attribution: ATTR,
  };
}

async function resolve(token: string) {
  const [v2h, a, l] = await Promise.all([
    callSafe(V2_FACTORY, callData(SEL.getLaunchedToken, token)),
    callSafe(V1_ACTIVE, callData(SEL.getLaunchedToken, token)),
    callSafe(V1_LEGACY, callData(SEL.getLaunchedToken, token)),
  ]);
  if (v2h) {
    const rec = decodeV2(v2h);
    if (rec.exists) return { gen: "v2" as const, factory: V2_FACTORY, v2: rec };
  }
  if (a) {
    const rec = decodeV1(a);
    if (rec.exists) return { gen: "v1" as const, factory: V1_ACTIVE, v1: rec };
  }
  if (l) {
    const rec = decodeV1(l);
    if (rec.exists) return { gen: "v1" as const, factory: V1_LEGACY, v1: rec };
  }
  return null;
}

export async function ponsToken(address: string) {
  if (!isAddress(address)) return { ok: false, error: "Provide a token address." };
  const hit = await resolve(address);
  if (!hit) return { ok: false, error: "Not a pons launch token." };
  const [nameH, symH, usd] = await Promise.all([
    callSafe(address, SEL.name),
    callSafe(address, SEL.symbol),
    ethUsd(),
  ]);
  const name = nameH ? decodeString(nameH, 0) : null;
  const symbol = symH ? decodeString(symH, 0) : null;
  if (hit.gen === "v2") {
    const rec = hit.v2;
    const realH = await callSafe(rec.curve, SEL.realQuoteReserve);
    const resH = await callSafe(rec.curve, SEL.getReserves);
    const real = realH ? wordBig(realH, 0) : 0n;
    const thresh = BigInt(rec.graduationThreshold);
    const quoteR = resH ? wordBig(resH, 0) : 0n;
    const tokenR = resH ? wordBig(resH, 1) : 0n;
    const priceInQuote = tokenR === 0n ? null : Number((quoteR * 10n ** 18n) / tokenR) / 1e18;
    const infoH = await callSafe(address, SEL.getTokenInfo);
    const logo = infoH ? ipfsHttp(decodeString(infoH, 1)) : null;
    const graduated = rec.phase >= 2;
    return {
      ok: true,
      generation: "v2",
      token: rec.token,
      meta: { name, symbol, logo },
      launch: rec,
      graduation: {
        graduated,
        phase: rec.phaseLabel,
        progress: graduated ? 1 : progress(real, thresh),
        thresholdEth: toEth(thresh),
        note: "Graduation means the curve sold out. It is not a quality signal.",
      },
      priceUsd: isZero(rec.pairToken) && priceInQuote != null && usd ? priceInQuote * usd : null,
      attribution: ATTR,
    };
  }
  const rec = hit.v1!;
  const [gradH, poolH, logoH] = await Promise.all([
    callSafe(hit.factory, callData(SEL.graduationStatus, address)),
    callSafe(address, SEL.liquidityPool),
    callSafe(address, SEL.logo),
  ]);
  const paired = gradH ? wordBig(gradH, 0) : 0n;
  const thresh = gradH ? wordBig(gradH, 1) : 0n;
  const graduated = gradH ? wordBool(gradH, 2) : false;
  return {
    ok: true,
    generation: "v1",
    token: rec.token,
    meta: { name, symbol, logo: logoH ? ipfsHttp(decodeString(logoH, 0)) : null, pool: poolH ? wordAddr(poolH, 0) : null },
    launch: rec,
    graduation: {
      graduated,
      progress: progress(paired, thresh),
      thresholdEth: toEth(thresh),
      note: "Graduation confirms paired WETH reached the threshold. Not a quality signal.",
    },
    attribution: ATTR,
  };
}

export async function ponsLaunches(limit = 24, lookback = 8000) {
  const latestHex = await rpc<string>("eth_blockNumber");
  const latest = Number(BigInt(latestHex));
  const from = Math.max(0, latest - lookback);
  const logs = await rpc<any[]>("eth_getLogs", [
    {
      address: V2_FACTORY,
      fromBlock: "0x" + from.toString(16),
      toBlock: "latest",
      topics: [V2_TOPIC],
    },
  ]).catch(() => []);
  const rows = (logs || [])
    .map((l) => ({
      token: topicAddr(l.topics[1]),
      curve: topicAddr(l.topics[2]),
      deployer: topicAddr(l.topics[3]),
      pairToken: wordAddr(l.data, 0),
      graduationThreshold: wordBig(l.data, 2).toString(),
      blockNumber: Number(BigInt(l.blockNumber)),
      txHash: l.transactionHash,
    }))
    .sort((a, b) => b.blockNumber - a.blockNumber)
    .slice(0, Math.min(limit, 80));
  const launches = [];
  for (const row of rows) {
    const [nameH, symH, recH] = await Promise.all([
      callSafe(row.token, SEL.name),
      callSafe(row.token, SEL.symbol),
      callSafe(V2_FACTORY, callData(SEL.getLaunchedToken, row.token)),
    ]);
    const rec = recH ? decodeV2(recH) : null;
    launches.push({
      generation: "v2",
      token: row.token,
      deployer: row.deployer,
      curve: row.curve,
      quote: isZero(row.pairToken) ? "ETH" : "ERC20",
      name: nameH ? decodeString(nameH, 0) : null,
      symbol: symH ? decodeString(symH, 0) : null,
      graduated: (rec?.phase || 0) >= 2,
      phase: rec?.phaseLabel,
      progress: rec && rec.phase >= 2 ? 1 : null,
      blockNumber: row.blockNumber,
      txHash: row.txHash,
      thresholdEth: toEth(BigInt(row.graduationThreshold)),
    });
  }
  return {
    ok: true,
    source: "pons",
    lookbackBlocks: lookback,
    latestBlock: latest,
    counted: { v2: (logs || []).length, v1: 0 },
    launches,
    app: PONS_APP,
    attribution: ATTR,
  };
}

export const PONS_TOOLS = [
  ["list_pons_launches", "Index pons launches from factory TokenLaunched logs."],
  ["get_pons_token", "Full on-chain pons launch record."],
  ["get_pons_graduation", "Graduation progress for a pons token."],
  ["get_pons_protocol", "pons network facts and contracts."],
] as const;
