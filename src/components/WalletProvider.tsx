"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { CHAIN } from "@/lib/chain";
import { assertLaunchTx } from "@/lib/txguard";

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (ev: string, cb: (...a: unknown[]) => void) => void;
  removeListener?: (ev: string, cb: (...a: unknown[]) => void) => void;
};

function getProvider(): EthereumProvider | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    phantom?: { ethereum?: EthereumProvider };
    ethereum?: EthereumProvider & { providers?: EthereumProvider[]; isPhantom?: boolean };
  };
  if (w.phantom?.ethereum) return w.phantom.ethereum;
  if (w.ethereum?.isPhantom) return w.ethereum;
  const list = w.ethereum?.providers;
  const phantom = list?.find((p) => (p as { isPhantom?: boolean }).isPhantom);
  return phantom || w.ethereum || null;
}

type WalletState = {
  address: string | null;
  chainId: string | null;
  connecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  addChain: () => Promise<void>;
  signLaunch: (tx: { to: string; data: string; value: string; chainId?: string }) => Promise<string>;
};

const Ctx = createContext<WalletState | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const provider = getProvider();
    if (!provider?.on) return;
    const onAccounts = (...a: unknown[]) => {
      const accs = a[0] as string[] | undefined;
      setAddress(accs?.[0] || null);
    };
    const onChain = (...a: unknown[]) => setChainId(String(a[0] || ""));
    provider.on("accountsChanged", onAccounts);
    provider.on("chainChanged", onChain);
    return () => {
      provider.removeListener?.("accountsChanged", onAccounts);
      provider.removeListener?.("chainChanged", onChain);
    };
  }, []);

  const addChain = useCallback(async () => {
    const provider = getProvider();
    if (!provider) throw new Error("Install Phantom (Ethereum mode) or another EIP-1193 wallet.");
    try {
      await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: CHAIN.hexId }] });
    } catch {
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: CHAIN.hexId,
            chainName: CHAIN.name,
            nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
            rpcUrls: [CHAIN.rpc],
            blockExplorerUrls: [CHAIN.explorer],
          },
        ],
      });
    }
    const id = String((await provider.request({ method: "eth_chainId" })) || "").toLowerCase();
    setChainId(id);
    if (id !== CHAIN.hexId.toLowerCase()) {
      throw new Error(`Wallet is not on Robinhood Chain (${CHAIN.id}). Switch network in Phantom, then retry.`);
    }
  }, []);

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(null);
    try {
      const provider = getProvider();
      if (!provider) throw new Error("Phantom not found. Open this page in a browser with Phantom, then use Ethereum mode.");
      await addChain();
      const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
      setAddress(accounts[0] || null);
      const id = (await provider.request({ method: "eth_chainId" })) as string;
      setChainId(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setConnecting(false);
    }
  }, [addChain]);

  const signLaunch = useCallback(
    async (tx: { to: string; data: string; value: string; chainId?: string }) => {
      const provider = getProvider();
      if (!provider || !address) throw new Error("Connect Phantom first.");
      const safe = assertLaunchTx(tx);
      await addChain();
      const id = String((await provider.request({ method: "eth_chainId" })) || "").toLowerCase();
      if (id !== CHAIN.hexId.toLowerCase()) throw new Error("Wrong chain. Switch to Robinhood Chain before signing.");
      const hash = (await provider.request({
        method: "eth_sendTransaction",
        params: [{ from: address, to: safe.to, data: safe.data, value: safe.value }],
      })) as string;
      return hash;
    },
    [address, addChain],
  );

  const value = useMemo(
    () => ({ address, chainId, connecting, error, connect, addChain, signLaunch }),
    [address, chainId, connecting, error, connect, addChain, signLaunch],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWallet() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useWallet needs WalletProvider");
  return ctx;
}
