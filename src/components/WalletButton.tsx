"use client";

import { useWallet } from "./WalletProvider";
import { CHAIN } from "@/lib/chain";

export function WalletButton() {
  const { address, connecting, connect, chainId, error } = useWallet();
  const onChain = chainId?.toLowerCase() === CHAIN.hexId.toLowerCase();
  const label = connecting
    ? "…"
    : address
      ? `${address.slice(0, 6)}…${address.slice(-4)}${onChain ? "" : " ⚠"}`
      : "Phantom";
  return (
    <div className="relative">
      <button
        type="button"
        onClick={connect}
        aria-label={
          connecting
            ? "Connecting wallet"
            : address
              ? onChain
                ? `Connected ${address}`
                : `Connected ${address}, wrong network — click to switch to Robinhood Chain`
              : "Connect Phantom wallet"
        }
        className="rounded-full bg-gradient-to-b from-flare to-blood px-3 py-2 text-[11px] font-medium tracking-[0.08em] text-ivory hover:brightness-110"
      >
        {label}
      </button>
      {error ? (
        <p className="absolute right-0 top-9 z-40 w-48 rounded-md border border-flare/30 bg-black/90 p-2 text-[10px] text-flare">
          {error}
        </p>
      ) : null}
    </div>
  );
}
