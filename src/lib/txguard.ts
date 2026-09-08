import { CHAIN, isAddress } from "./chain";

/** pons v2 factory on Robinhood Chain. Keep in this small module so the wallet client can import it. */
export const PONS_V2_FACTORY = "0x7ed598bcef8bd9edd8c97a195c6d13f40801ec7e";
export const LAUNCH_TOKEN_SELECTOR = "0xa41d5f2b";

const MAX_LAUNCH_FEE_WEI = 10n ** 17n; // 0.1 ETH — fee is ~0.0005 ETH

export type UnsignedLaunch = { to: string; data: string; value: string; chainId?: string };

export function assertLaunchTx(tx: UnsignedLaunch): UnsignedLaunch {
  if (!tx?.to || !isAddress(tx.to)) throw new Error("Launch destination is not a valid address.");
  if (tx.to.toLowerCase() !== PONS_V2_FACTORY) {
    throw new Error("Launch destination is not the pons v2 factory on Robinhood Chain.");
  }
  const data = String(tx.data || "").toLowerCase();
  if (!data.startsWith(LAUNCH_TOKEN_SELECTOR)) {
    throw new Error("Transaction data is not a pons launchToken call.");
  }
  if (tx.chainId && tx.chainId.toLowerCase() !== CHAIN.hexId.toLowerCase()) {
    throw new Error(`Wrong chain. Expected Robinhood Chain ${CHAIN.hexId}.`);
  }
  let value = 0n;
  try {
    value = BigInt(tx.value || "0x0");
  } catch {
    throw new Error("Launch value is not a valid hex amount.");
  }
  if (value <= 0n) throw new Error("Launch fee is missing.");
  if (value > MAX_LAUNCH_FEE_WEI) throw new Error("Launch fee is larger than expected. Refusing to sign.");
  return {
    to: tx.to,
    data: tx.data,
    value: tx.value,
    chainId: tx.chainId || CHAIN.hexId,
  };
}
