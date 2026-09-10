import { consumeNamedLimit } from "./ratelimit";
import { SEAL_BURN_USD, SEAL_EDITION_CAP, SERVICE_WALLET_PUBLIC, scanUrl } from "./onchain-config";
import { assembleFromChain, spendLast24h } from "./onchain-chain-index";
import { assembleSealsFromChain, sealSetStatus, type PublicSeal } from "./onchain-seal-index";
import { buildSealMemo, decodeSealImage, sanitizeSealNote } from "./onchain-seal";
import { BURNABLE_TOKENS, resolveBurnableToken } from "./onchain-tokens";
import { effectiveFlags } from "./onchain-store";
import { serviceWalletReady } from "./orbitx-signer";

export type WriteSealInput = {
  token: unknown;
  note: unknown;
  imageBase64: unknown;
  imageMime?: unknown;
  usd?: unknown;
  source: "website" | "mcp";
  wallet?: string | null;
};

export type SealCensus = {
  ok: true;
  items: PublicSeal[];
  editionCap: number;
  minted: number;
  remaining: number;
  soldOut: boolean;
};

function emptySeal(partial: Partial<PublicSeal> & Pick<PublicSeal, "note" | "tokenMint" | "tokenSymbol" | "tokenName">): PublicSeal {
  return {
    id: partial.id || "",
    note: partial.note,
    memo: partial.memo || "",
    tokenMint: partial.tokenMint,
    tokenSymbol: partial.tokenSymbol,
    tokenName: partial.tokenName,
    imageId: partial.imageId || "",
    imageUrl: partial.imageUrl || "",
    nftMint: partial.nftMint || "",
    sha256: partial.sha256 || "",
    edition: partial.edition || 0,
    editionCap: partial.editionCap || SEAL_EDITION_CAP,
    memoStatus: partial.memoStatus || "idle",
    buyStatus: partial.buyStatus || "idle",
    burnStatus: partial.burnStatus || "idle",
    memoTx: partial.memoTx || null,
    buyTx: partial.buyTx || null,
    burnTx: partial.burnTx || null,
    nftTx: partial.nftTx || null,
    memoUrl: partial.memoUrl || null,
    buyUrl: partial.buyUrl || null,
    burnUrl: partial.burnUrl || null,
    tokenAmount: partial.tokenAmount ?? null,
    usdValue: partial.usdValue ?? SEAL_BURN_USD,
    solSpent: partial.solSpent ?? null,
    priceUsd: partial.priceUsd ?? null,
    createdAt: partial.createdAt || new Date().toISOString(),
    error: partial.error || null,
  };
}

let censusCache: { at: number; data: SealCensus } | null = null;
const CENSUS_TTL_MS = 12_000;

export async function censusTokenSeals(force = false): Promise<SealCensus> {
  if (!force && censusCache && Date.now() - censusCache.at < CENSUS_TTL_MS) {
    return censusCache.data;
  }
  const { fetchServiceRawTxs } = await import("./orbitx-chain");
  const raw = await fetchServiceRawTxs(Math.min(400, Math.max(80, SEAL_EDITION_CAP * 4)));
  const items = assembleSealsFromChain(raw.txs);
  const data: SealCensus = { ok: true, items, ...sealSetStatus(items.length) };
  censusCache = { at: Date.now(), data };
  return data;
}

export async function listBurnableTokens() {
  const { tokenMarketPrice } = await import("./orbitx-chain");
  const priced = await Promise.all(
    BURNABLE_TOKENS.map(async (token) => {
      const market = await tokenMarketPrice(token.mint).catch(() => null);
      return { ...token, priceUsd: market?.priceUsd ?? null };
    }),
  );
  return priced;
}

export async function listTokenSeals(limit = 50): Promise<SealCensus> {
  const census = await censusTokenSeals();
  const take = Number.isFinite(limit) ? Math.max(1, Math.min(limit, SEAL_EDITION_CAP)) : SEAL_EDITION_CAP;
  return { ...census, items: census.items.filter((s) => s.edition <= SEAL_EDITION_CAP).slice(0, take) };
}

export async function writeTokenSeal(input: WriteSealInput) {
  const token = resolveBurnableToken(input.token);
  if (!token) return { ok: false as const, status: 400, error: "Pick a supported token: $ORBITX or $ROKHA." };
  const cleaned = sanitizeSealNote(input.note);
  if (!cleaned.ok) return { ok: false as const, status: 400, error: cleaned.error };
  const image = decodeSealImage({ imageBase64: input.imageBase64, imageMime: input.imageMime });
  if (!image.ok) return { ok: false as const, status: 400, error: image.error };
  const usd = Math.min(SEAL_BURN_USD, Math.max(0.01, Number(input.usd || SEAL_BURN_USD) || SEAL_BURN_USD));
  if (!serviceWalletReady()) {
    return { ok: false as const, status: 503, error: "Service wallet is not configured. Seals are not signing." };
  }
  const flags = await effectiveFlags();
  if (!flags.notesEnabled) {
    return { ok: false as const, status: 503, error: flags.pausedReason || "On-chain seals are paused." };
  }
  const census = await censusTokenSeals(true);
  if (census.soldOut) {
    return {
      ok: false as const,
      status: 403,
      error: `The Saturn seal set is closed. Only ${SEAL_EDITION_CAP} cards will ever be minted.`,
    };
  }
  const hourKey = `seal:${input.source}:${(input.wallet || "anon").slice(0, 64)}`;
  const perWallet = consumeNamedLimit(hourKey, input.source === "mcp" ? 4 : 8, 60 * 60_000);
  const global = consumeNamedLimit("seal:global", 20, 60 * 60_000);
  if (!perWallet.ok || !global.ok) {
    return { ok: false as const, status: 429, error: "Seal rate limit reached. Try again later." };
  }

  try {
    const chain = await import("./orbitx-chain");
    const raw = await chain.fetchServiceRawTxs(48).catch(() => ({ txs: [] as Awaited<ReturnType<typeof chain.fetchServiceRawTxs>>["txs"] }));
    const assembled = assembleFromChain(raw.txs);
    const spend = spendLast24h(assembled.activity, assembled.notes);
    if (spend.burnUsd + usd > flags.maxDailyBurnUsd) {
      return { ok: false as const, status: 429, error: "Daily buy/burn USD limit reached." };
    }
    if (spend.sol + 0.01 > flags.maxDailySolSpend) {
      return { ok: false as const, status: 429, error: "Daily SOL spend limit reached." };
    }

    const uploaded = await import("./irys-upload").then((m) => m.uploadPermanentImage(image.image.bytes, image.image.mime));
    let nftMint = "";
    let nftTx: string | null = null;
    try {
      const nft = await import("./seal-mint").then((m) =>
        m.mintSealNft({
          name: `Apogee ${token.symbol} seal`,
          symbol: "SEAL",
          uri: uploaded.url,
        }),
      );
      nftMint = nft.mint;
      nftTx = nft.signature;
    } catch {
      /* image is already permanent on Irys/Arweave even if the 1/1 mint is skipped */
    }

    const memoText = buildSealMemo({
      tokenMint: token.mint,
      imageId: uploaded.id,
      nftMint,
      sha256: image.image.sha256,
      note: cleaned.note,
    });
    const memo = await chain.sendMemo(memoText);
    let seal = emptySeal({
      id: memo.signature,
      note: cleaned.note,
      memo: memoText,
      tokenMint: token.mint,
      tokenSymbol: token.symbol,
      tokenName: token.name,
      imageId: uploaded.id,
      imageUrl: uploaded.url,
      nftMint,
      sha256: image.image.sha256,
      memoStatus: "confirmed",
      memoTx: memo.signature,
      memoUrl: memo.explorerUrl,
      nftTx,
      usdValue: usd,
      edition: census.minted + 1,
      editionCap: SEAL_EDITION_CAP,
      createdAt: memo.blockTime || new Date().toISOString(),
    });
    censusCache = null;

    if (flags.autoBurnEnabled) {
      try {
        const buy = await chain.buyTokenForUsd({ mint: token.mint, burnUsd: usd, reserveUsd: token.reserveUsd });
        seal = {
          ...seal,
          buyStatus: "confirmed",
          buyTx: buy.tx.signature,
          buyUrl: scanUrl(buy.tx.signature),
          tokenAmount: buy.tokenAmount,
          solSpent: buy.solSpent,
          priceUsd: buy.priceUsd,
        };
        const burn = await chain.burnToken(token.mint, buy.tokenAmount, token.reserveUsd, usd);
        seal = {
          ...seal,
          burnStatus: "confirmed",
          burnTx: burn.tx.signature,
          burnUrl: scanUrl(burn.tx.signature),
          tokenAmount: burn.tokenAmount,
        };
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        seal = { ...seal, error: message.slice(0, 400), buyStatus: seal.buyStatus === "confirmed" ? "confirmed" : "failed", burnStatus: "failed" };
      }
    }
    return { ok: true as const, status: 201, seal };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Seal was not confirmed on Solana.";
    return { ok: false as const, status: 502, error: message.slice(0, 400) };
  }
}

export function sealWalletPublic() {
  return SERVICE_WALLET_PUBLIC;
}
