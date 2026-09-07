export const CHAIN = {
  id: 4663,
  hexId: "0x1237",
  name: "Robinhood Chain",
  slug: "robinhood",
  nativeSymbol: "ETH",
  explorer: "https://robinhoodchain.blockscout.com",
  dexScreener: "https://dexscreener.com/robinhood",
  geckoNetwork: "robinhood",
  rpc: process.env.APOGEE_RPC_URL || "https://rpc.mainnet.chain.robinhood.com",
} as const;

export const TOKENS = {
  WETH: "0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73",
  USDG: "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168",
} as const;

export const ENDPOINTS = {
  dex: "https://api.dexscreener.com",
  gecko: "https://api.geckoterminal.com/api/v2",
  rhj: "https://api.robinhood.com/rhj",
  llama: "https://api.llama.fi",
} as const;

export const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

export function isAddress(value: string): boolean {
  return ADDRESS_RE.test(value.trim());
}

export function checksumHint(address: string): string {
  return address.trim();
}

export function shortAddress(address: string): string {
  const a = address.trim();
  if (a.length < 12) return a;
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export function explorerToken(address: string): string {
  return `${CHAIN.explorer}/token/${address}`;
}

export function explorerTx(hash: string): string {
  return `${CHAIN.explorer}/tx/${hash}`;
}

export function explorerAddress(address: string): string {
  return `${CHAIN.explorer}/address/${address}`;
}

export function dexTokenUrl(address: string): string {
  return `${CHAIN.dexScreener}/${address}`;
}

export const ERC20 = {
  name: "0x06fdde03",
  symbol: "0x95d89b41",
  decimals: "0x313ce567",
  totalSupply: "0x18160ddd",
  balanceOf: "0x70a08231",
} as const;
