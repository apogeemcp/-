import { Keypair } from "@solana/web3.js";
import { SERVICE_WALLET_PUBLIC, serviceSecretConfigured } from "./onchain-config";

const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function decodeBs58(value: string): Uint8Array {
  const bytes = [0];
  for (const ch of value) {
    const idx = ALPHABET.indexOf(ch);
    if (idx < 0) throw new Error("Invalid service wallet encoding.");
    let carry = idx;
    for (let i = 0; i < bytes.length; i++) {
      const x = bytes[i] * 58 + carry;
      bytes[i] = x & 255;
      carry = x >> 8;
    }
    while (carry) {
      bytes.push(carry & 255);
      carry >>= 8;
    }
  }
  let zeros = 0;
  for (const ch of value) {
    if (ch === "1") zeros++;
    else break;
  }
  return Uint8Array.from([...new Array(zeros).fill(0), ...bytes.reverse()]);
}

function parseSecret(raw: string): Uint8Array {
  const value = raw.trim();
  if (value.startsWith("[")) {
    const nums = JSON.parse(value) as unknown;
    if (!Array.isArray(nums) || nums.length < 64) throw new Error("Service wallet is not configured.");
    return Uint8Array.from(nums.slice(0, 64).map((n) => Number(n)));
  }
  return decodeBs58(value);
}

let cached: Keypair | null = null;

export function servicePublicAddress(): string {
  try {
    return loadServiceKeypair().publicKey.toBase58();
  } catch {
    return SERVICE_WALLET_PUBLIC;
  }
}

export function loadServiceKeypair(): Keypair {
  if (cached) return cached;
  const raw = process.env.ORBITX_SERVICE_PRIVATE_KEY;
  if (!raw?.trim()) throw new Error("Service wallet is not configured.");
  let secret: Uint8Array;
  try {
    secret = parseSecret(raw);
  } catch {
    throw new Error("Service wallet is not configured.");
  }
  if (secret.length < 64) throw new Error("Service wallet is not configured.");
  const keypair = Keypair.fromSecretKey(secret.slice(0, 64));
  cached = keypair;
  return keypair;
}

export function serviceWalletReady(): boolean {
  if (!serviceSecretConfigured()) return false;
  try {
    loadServiceKeypair();
    return true;
  } catch {
    return false;
  }
}
