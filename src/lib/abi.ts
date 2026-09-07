/** Minimal ABI word helpers. No viem dependency. */

export function strip0x(hex: string): string {
  return hex.replace(/^0x/i, "");
}

export function word(hex: string, index: number): string {
  const h = strip0x(hex);
  return h.slice(index * 64, index * 64 + 64);
}

export function wordCount(hex: string): number {
  return Math.floor(strip0x(hex).length / 64);
}

export function wordBig(hex: string, index: number): bigint {
  const w = word(hex, index);
  if (!w) return 0n;
  return BigInt("0x" + w);
}

export function wordAddr(hex: string, index: number): string {
  const w = word(hex, index);
  if (!w) return "0x0000000000000000000000000000000000000000";
  return ("0x" + w.slice(24)).toLowerCase();
}

export function wordBool(hex: string, index: number): boolean {
  return wordBig(hex, index) !== 0n;
}

export function wordInt(hex: string, index: number, bits = 24): number {
  const mask = (1n << BigInt(bits)) - 1n;
  const u = wordBig(hex, index) & mask;
  const sign = 1n << BigInt(bits - 1);
  const signed = u >= sign ? u - (1n << BigInt(bits)) : u;
  return Number(signed);
}

export function topicAddr(topic: string): string {
  return ("0x" + strip0x(topic).slice(24)).toLowerCase();
}

export function toUtf8(hexChars: string): string {
  const bytes = new Uint8Array((hexChars.match(/.{2}/g) || []).map((b) => parseInt(b, 16)));
  return new TextDecoder().decode(bytes).replace(/\u0000/g, "").trim();
}

/** Decode a dynamic string whose offset lives at word `headIndex` of `hex`. Offsets are from the start of `hex`. */
export function decodeString(hex: string, headIndex: number): string {
  const abs = Number(wordBig(hex, headIndex));
  return decodeStringAt(hex, abs);
}

export function decodeStringAt(hex: string, byteOffset: number): string {
  const h = strip0x(hex);
  const start = byteOffset * 2;
  if (start + 64 > h.length) return "";
  const len = Number.parseInt(h.slice(start, start + 64), 16);
  if (!Number.isFinite(len) || len <= 0) return "";
  const data = h.slice(start + 64, start + 64 + len * 2);
  return toUtf8(data);
}

/** Tuple of N strings whose head (N offsets) starts at `byteOffset`. */
export function decodeStringTupleAt(hex: string, byteOffset: number, n: number): string[] {
  const h = strip0x(hex);
  const head = h.slice(byteOffset * 2);
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const rel = Number(wordBig("0x" + head, i));
    out.push(decodeStringAt("0x" + head, rel));
  }
  return out;
}

export function callData(selector: string, address?: string): string {
  const sel = selector.replace(/^0x/i, "").padStart(8, "0");
  if (!address) return "0x" + sel;
  return "0x" + sel + address.replace(/^0x/i, "").toLowerCase().padStart(64, "0");
}

export function isZeroAddress(address: string | null | undefined): boolean {
  return !address || /^0x0{40}$/i.test(address);
}

export function checksumAddr(address: string): string {
  return address.startsWith("0x") ? address : `0x${address}`;
}

export function ipfsHttp(uri: string | null | undefined): string | null {
  if (!uri) return null;
  const u = uri.trim();
  if (!u) return null;
  if (u.startsWith("ipfs://")) return `https://ipfs.io/ipfs/${u.slice("ipfs://".length)}`;
  return u;
}

export function bigintToDecimal(value: bigint, decimals = 18, digits = 8): number {
  if (value === 0n) return 0;
  const neg = value < 0n;
  const v = neg ? -value : value;
  const base = 10n ** BigInt(decimals);
  const whole = v / base;
  const scale = 10n ** BigInt(digits);
  const frac = ((v % base) * scale) / base;
  const n = Number(whole) + Number(frac) / Number(scale);
  return neg ? -n : n;
}

export function ratio(num: bigint, den: bigint): number | null {
  if (den === 0n) return null;
  const scale = 10n ** 18n;
  return Number((num * scale) / den) / 1e18;
}
