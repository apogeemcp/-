"use client";

import { useWallet } from "./WalletProvider";
import { CHAIN } from "@/lib/chain";

export function WalletButton() {
  const { address, connecting, connect, chainId, error } = useWallet();
  const onChain = chainId?.toLowerCase() === CHAIN.hexId.toLowerCase();
  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={connect}
        className="rounded-full bg-gradient-to-r from-gold via-ember to-flare px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-void"
      >
        {connecting
          ? "Connecting…"
          : address
            ? `${address.slice(0, 6)}…${address.slice(-4)}${onChain ? "" : " · switch"}`
            : "Connect Phantom"}
      </button>
      {error ? <p className="max-w-[14rem] text-right text-[10px] text-flare">{error}</p> : null}
    </div>
  );
}
