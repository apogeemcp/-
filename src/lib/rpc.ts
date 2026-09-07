export async function fetchJson<T>(
  url: string,
  init: RequestInit = {},
  ms = 12_000,
): Promise<{ ok: boolean; status: number; data: T | null; error?: string }> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    const headers = new Headers(init.headers);
    if (!headers.has("accept")) headers.set("accept", "application/json");
    const res = await fetch(url, { ...init, headers, signal: ctl.signal });
    const text = await res.text();
    if (!text) return { ok: res.ok, status: res.status, data: null };
    try {
      return { ok: res.ok, status: res.status, data: JSON.parse(text) as T };
    } catch {
      return { ok: false, status: res.status, data: null, error: "invalid json" };
    }
  } catch (error) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(t);
  }
}

export async function rpc<T = unknown>(method: string, params: unknown[] = [], attempts = 4): Promise<T> {
  const url = process.env.APOGEE_RPC_URL || "https://rpc.mainnet.chain.robinhood.com";
  let last: Error | null = null;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      });
      if (res.status === 429) throw new Error("Too Many Requests");
      const body = (await res.json()) as { result?: T; error?: { message?: string } };
      if (body.error) throw new Error(body.error.message || "rpc error");
      return body.result as T;
    } catch (error) {
      last = error instanceof Error ? error : new Error(String(error));
      const retryable = /429|Too Many|fetch|network|timeout|rpc error/i.test(last.message);
      if (!retryable || i === attempts - 1) throw last;
      await new Promise((r) => setTimeout(r, 350 * 2 ** i));
    }
  }
  throw last || new Error("rpc error");
}

export function padAddress(address: string): string {
  return address.replace(/^0x/i, "").toLowerCase().padStart(64, "0");
}

export function decodeHexString(hex: string): string {
  const h = hex.replace(/^0x/i, "");
  if (h.length <= 64) {
    const bytes = h.match(/.{2}/g) || [];
    const chars = bytes.map((b) => parseInt(b, 16)).filter((n) => n > 0);
    return String.fromCharCode(...chars).replace(/\u0000/g, "").trim();
  }
  const len = parseInt(h.slice(64, 128), 16);
  const data = h.slice(128, 128 + len * 2);
  const bytes = data.match(/.{2}/g) || [];
  return bytes
    .map((b) => parseInt(b, 16))
    .filter((n) => n > 0)
    .map((n) => String.fromCharCode(n))
    .join("")
    .trim();
}

export function hexToBigInt(hex: string | null | undefined): bigint {
  if (!hex || hex === "0x") return 0n;
  return BigInt(hex);
}

export function formatUnits(value: bigint, decimals: number): string {
  const neg = value < 0n;
  const v = neg ? -value : value;
  const base = 10n ** BigInt(decimals);
  const whole = v / base;
  const frac = (v % base).toString().padStart(decimals, "0").replace(/0+$/, "");
  return `${neg ? "-" : ""}${whole.toString()}${frac ? `.${frac}` : ""}`;
}

export async function ethCall(to: string, data: string): Promise<string> {
  return rpc<string>("eth_call", [{ to, data }, "latest"]);
}

export async function erc20Meta(address: string): Promise<{
  name: string | null;
  symbol: string | null;
  decimals: number | null;
  totalSupply: string | null;
}> {
  const [nameHex, symbolHex, decHex, supplyHex] = await Promise.all([
    ethCall(address, "0x06fdde03").catch(() => "0x"),
    ethCall(address, "0x95d89b41").catch(() => "0x"),
    ethCall(address, "0x313ce567").catch(() => "0x"),
    ethCall(address, "0x18160ddd").catch(() => "0x"),
  ]);
  const decimals = decHex && decHex !== "0x" ? Number(hexToBigInt(decHex)) : null;
  const supply =
    supplyHex && supplyHex !== "0x" && decimals != null
      ? formatUnits(hexToBigInt(supplyHex), decimals)
      : null;
  return {
    name: nameHex && nameHex !== "0x" ? decodeHexString(nameHex) : null,
    symbol: symbolHex && symbolHex !== "0x" ? decodeHexString(symbolHex) : null,
    decimals,
    totalSupply: supply,
  };
}

export async function erc20Balance(token: string, holder: string): Promise<bigint> {
  const data = `0x70a08231${padAddress(holder)}`;
  const hex = await ethCall(token, data);
  return hexToBigInt(hex);
}

export async function nativeBalance(address: string): Promise<bigint> {
  const hex = await rpc<string>("eth_getBalance", [address, "latest"]);
  return hexToBigInt(hex);
}

export async function latestBlock(): Promise<{ number: number; timestamp: number | null }> {
  const [hex, block] = await Promise.all([
    rpc<string>("eth_blockNumber"),
    rpc<{ timestamp?: string }>("eth_getBlockByNumber", ["latest", false]),
  ]);
  return {
    number: Number(hexToBigInt(hex)),
    timestamp: block?.timestamp ? Number(hexToBigInt(block.timestamp)) : null,
  };
}

export async function gasPriceWei(): Promise<bigint> {
  const hex = await rpc<string>("eth_gasPrice");
  return hexToBigInt(hex);
}

export async function getTransaction(hash: string): Promise<unknown> {
  const [tx, receipt] = await Promise.all([
    rpc("eth_getTransactionByHash", [hash]),
    rpc("eth_getTransactionReceipt", [hash]).catch(() => null),
  ]);
  return { transaction: tx, receipt };
}
