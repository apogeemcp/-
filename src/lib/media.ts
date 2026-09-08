import { ipfsHttp } from "./abi";

const FALLBACK_GATEWAYS = ["https://ipfs.io/ipfs/", "https://cloudflare-ipfs.com/ipfs/", "https://dweb.link/ipfs/"];

export function mediaUrl(uri: string | null | undefined): string | null {
  const resolved = ipfsHttp(uri);
  if (!resolved) return null;
  if (resolved.startsWith("http://")) return resolved.replace(/^http:\/\//, "https://");
  return resolved;
}

export function ipfsGateways(uri: string | null | undefined): string[] {
  const primary = mediaUrl(uri);
  if (!primary) return [];
  const cid = primary.match(/\/ipfs\/([^/?#]+)/)?.[1];
  if (!cid) return [primary];
  const rest = primary.split(`/ipfs/${cid}`)[1] || "";
  const alts = FALLBACK_GATEWAYS.map((g) => `${g}${cid}${rest}`);
  return [...new Set([primary, ...alts])];
}

export function letterMark(symbol?: string | null, name?: string | null): string {
  const s = (symbol || name || "?").trim();
  return s.slice(0, 1).toUpperCase() || "?";
}
