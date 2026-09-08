import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { verifyMessage } from "viem";
import { isAddress } from "./chain";
import { sbInsert, sbRest, supabaseAdmin } from "./supabase-admin";

export const SESSION_COOKIE = "apogee_session";
const NONCE_TTL_MS = 10 * 60_000;
const SESSION_TTL_MS = 7 * 24 * 60 * 60_000;

type NonceRow = { nonce: string; address: string; exp: number };
const memoryNonces = new Map<string, NonceRow>();

export type SessionPayload = {
  v: 1;
  address: string;
  chain: "eip155";
  exp: number;
};

function sessionSecret(): string | null {
  return process.env.APOGEE_SESSION_SECRET?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || null;
}

export function sessionConfigured(): boolean {
  return Boolean(sessionSecret());
}

function sign(body: string): string {
  const secret = sessionSecret();
  if (!secret) throw new Error("SESSION_UNCONFIGURED");
  return createHmac("sha256", secret).update(body).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function issueSession(address: string): { token: string; exp: number } {
  const exp = Date.now() + SESSION_TTL_MS;
  const payload: SessionPayload = { v: 1, address: address.toLowerCase(), chain: "eip155", exp };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return { token: `${body}.${sign(body)}`, exp };
}

export function readSession(token: string | undefined | null): SessionPayload | null {
  if (!token || !sessionSecret()) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  try {
    if (!safeEqual(sign(body), sig)) return null;
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
    if (payload.v !== 1 || payload.chain !== "eip155") return null;
    if (!isAddress(payload.address) || Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export function cookieFromRequest(req: Request): string | null {
  const raw = req.headers.get("cookie") || "";
  const match = raw.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`));
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export function sessionFromRequest(req: Request): SessionPayload | null {
  return readSession(cookieFromRequest(req));
}

export function sessionCookieHeader(token: string, exp: number): string {
  const maxAge = Math.max(1, Math.floor((exp - Date.now()) / 1000));
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${
    process.env.NODE_ENV === "production" ? "; Secure" : ""
  }`;
}

export function clearSessionCookieHeader(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export function buildSiweMessage(input: { origin: string; address: string; nonce: string; issuedAt: string }) {
  return [
    "Apogee wants you to prove you own this wallet.",
    "",
    `Address: ${input.address}`,
    `URI: ${input.origin}`,
    "Version: 1",
    `Chain: eip155 (Phantom Ethereum / compatible wallet)`,
    `Nonce: ${input.nonce}`,
    `Issued At: ${input.issuedAt}`,
    "",
    "This signature is not a transaction and does not move funds.",
    "It does not purchase MCP access.",
  ].join("\n");
}

function pruneMemory(now = Date.now()) {
  for (const [k, v] of memoryNonces) {
    if (v.exp <= now) memoryNonces.delete(k);
  }
}

export async function issueNonce(address: string, origin: string) {
  const addr = address.toLowerCase();
  if (!isAddress(addr)) throw new Error("Invalid wallet address.");
  const nonce = randomBytes(16).toString("hex");
  const issuedAt = new Date().toISOString();
  const exp = Date.now() + NONCE_TTL_MS;
  const admin = supabaseAdmin();
  if (admin) {
    await sbInsert("apogee_auth_nonces", {
      nonce,
      address: addr,
      expires_at: new Date(exp).toISOString(),
      used: false,
    });
  } else {
    pruneMemory();
    memoryNonces.set(nonce, { nonce, address: addr, exp });
  }
  return { nonce, issuedAt, message: buildSiweMessage({ origin, address: addr, nonce, issuedAt }), exp };
}

export async function consumeNonce(address: string, nonce: string): Promise<boolean> {
  const addr = address.toLowerCase();
  const admin = supabaseAdmin();
  if (admin) {
    const found = await sbRest<Array<{ nonce: string; address: string; expires_at: string; used: boolean }>>(
      `apogee_auth_nonces?nonce=eq.${encodeURIComponent(nonce)}&select=nonce,address,expires_at,used`,
    );
    const row = found.data?.[0];
    if (!row || row.used || row.address.toLowerCase() !== addr) return false;
    if (new Date(row.expires_at).getTime() <= Date.now()) return false;
    const upd = await sbRest(`apogee_auth_nonces?nonce=eq.${encodeURIComponent(nonce)}&used=eq.false`, {
      method: "PATCH",
      body: JSON.stringify({ used: true, used_at: new Date().toISOString() }),
    });
    return upd.ok;
  }
  const row = memoryNonces.get(nonce);
  if (!row || row.address !== addr || row.exp <= Date.now()) return false;
  memoryNonces.delete(nonce);
  return true;
}

export async function verifyWalletSignature(input: {
  address: string;
  message: string;
  signature: string;
  nonce: string;
}): Promise<{ ok: true; address: string } | { ok: false; error: string }> {
  const address = input.address.toLowerCase();
  if (!isAddress(address)) return { ok: false, error: "Invalid wallet address." };
  if (!input.signature || input.signature.length < 8) return { ok: false, error: "Missing signature." };
  if (!input.message.includes(input.nonce)) return { ok: false, error: "Message does not contain the issued nonce." };
  if (!input.message.includes(address)) return { ok: false, error: "Message is not bound to this wallet." };
  const consumed = await consumeNonce(address, input.nonce);
  if (!consumed) return { ok: false, error: "Nonce is invalid, used, or expired." };
  try {
    const valid = await verifyMessage({
      address: address as `0x${string}`,
      message: input.message,
      signature: input.signature as `0x${string}`,
    });
    if (!valid) return { ok: false, error: "Signature verification failed." };
    return { ok: true, address };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Signature verification failed." };
  }
}

export function originFromRequest(req: Request): string {
  const proto = req.headers.get("x-forwarded-proto") || "https";
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "apogeemcp.digital";
  return `${proto}://${host}`;
}
