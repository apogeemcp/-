import { createHash } from "crypto";
import { SEAL_IMAGE_MAX_BYTES, SEAL_NOTE_MAX, SEAL_PREFIX } from "./onchain-config";
import { resolveBurnableToken, type BurnableToken } from "./onchain-tokens";

const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

export type SealImage = {
  bytes: Buffer;
  mime: "image/jpeg" | "image/png" | "image/webp";
  sha256: string;
};

export type SealMemo = {
  tokenMint: string;
  imageId: string;
  nftMint: string;
  sha256: string;
  note: string;
};

export function sanitizeSealNote(raw: unknown): { ok: true; note: string } | { ok: false; error: string } {
  if (typeof raw !== "string") return { ok: false, error: "Note must be text." };
  const note = raw.replace(CONTROL, "").normalize("NFC").trim();
  if (!note) return { ok: false, error: "Note cannot be empty." };
  if (note.length > SEAL_NOTE_MAX) return { ok: false, error: `Note must be ${SEAL_NOTE_MAX} characters or fewer.` };
  return { ok: true, note };
}

export function decodeSealImage(input: { imageBase64?: unknown; imageMime?: unknown }): { ok: true; image: SealImage } | { ok: false; error: string } {
  const raw = String(input.imageBase64 || "").replace(/^data:image\/\w+;base64,/, "").replace(/\s/g, "");
  if (!raw) return { ok: false, error: "Attach an image to mint on-chain." };
  let bytes: Buffer;
  try {
    bytes = Buffer.from(raw, "base64");
  } catch {
    return { ok: false, error: "Image could not be decoded." };
  }
  if (bytes.length < 32) return { ok: false, error: "Image is too small." };
  if (bytes.length > SEAL_IMAGE_MAX_BYTES) {
    return { ok: false, error: `Image must be ${Math.floor(SEAL_IMAGE_MAX_BYTES / 1024)} KB or smaller.` };
  }
  const mimeRaw = String(input.imageMime || sniffImageMime(bytes) || "").toLowerCase();
  const mime = mimeRaw === "image/jpg" ? "image/jpeg" : mimeRaw;
  if (!ALLOWED_MIME.has(mime)) return { ok: false, error: "Use a JPEG, PNG, or WebP image." };
  return {
    ok: true,
    image: { bytes, mime: mime as SealImage["mime"], sha256: createHash("sha256").update(bytes).digest("hex") },
  };
}

function sniffImageMime(bytes: Buffer): string | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return "image/jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes.toString("ascii", 8, 12) === "WEBP") {
    return "image/webp";
  }
  return null;
}

export function buildSealMemo(parts: SealMemo): string {
  return `${SEAL_PREFIX}${parts.tokenMint}:${parts.imageId}:${parts.nftMint || "-"}:${parts.sha256}:${parts.note}`;
}

export function parseSealMemo(memo: string): { ok: true; seal: SealMemo; token: BurnableToken } | { ok: false; error: string } {
  const value = String(memo || "").trim().replace(/^"|"$/g, "");
  if (!value.startsWith(SEAL_PREFIX)) return { ok: false, error: "Not an Apogee token seal memo." };
  const rest = value.slice(SEAL_PREFIX.length);
  const [tokenMint, imageId, nftMint, sha256, ...noteParts] = rest.split(":");
  const note = noteParts.join(":");
  const token = resolveBurnableToken(tokenMint);
  if (!token || !imageId || !sha256 || !note) return { ok: false, error: "Seal memo is incomplete." };
  return { ok: true, token, seal: { tokenMint: token.mint, imageId, nftMint: nftMint && nftMint !== "-" ? nftMint : "", sha256, note } };
}

export function sealImageUrl(imageId: string): string {
  if (!imageId || imageId.startsWith("sha256:")) return "";
  return `https://gateway.irys.xyz/${imageId}`;
}

export function arweaveImageUrl(imageId: string): string {
  if (!imageId || imageId.startsWith("sha256:")) return "";
  return `https://arweave.net/${imageId}`;
}
