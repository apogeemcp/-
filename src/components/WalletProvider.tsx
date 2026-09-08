"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { stringToHex } from "viem";
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

function solanaDetected(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as { phantom?: { solana?: { isPhantom?: boolean } } };
  return Boolean(w.phantom?.solana?.isPhantom);
}

type WalletState = {
  address: string | null;
  chainId: string | null;
  connecting: boolean;
  error: string | null;
  verified: boolean;
  verifying: boolean;
  solanaAdapter: boolean;
  connect: () => Promise<string | null>;
  addChain: () => Promise<void>;
  signLaunch: (tx: { to: string; data: string; value: string; chainId?: string }) => Promise<string>;
  signMessage: (message: string) => Promise<string>;
  verifyOwnership: () => Promise<boolean>;
  logoutSession: () => Promise<void>;
};

const Ctx = createContext<WalletState | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [solanaAdapter, setSolanaAdapter] = useState(false);

  useEffect(() => {
    setSolanaAdapter(solanaDetected());
    const provider = getProvider();
    if (!provider?.on) return;
    const onAccounts = (...a: unknown[]) => {
      const accs = a[0] as string[] | undefined;
      setAddress(accs?.[0] || null);
      setVerified(false);
    };
    const onChain = (...a: unknown[]) => setChainId(String(a[0] || ""));
    provider.on("accountsChanged", onAccounts);
    provider.on("chainChanged", onChain);
    return () => {
      provider.removeListener?.("accountsChanged", onAccounts);
      provider.removeListener?.("chainChanged", onChain);
    };
  }, []);

  useEffect(() => {
    if (!address) {
      setVerified(false);
      return;
    }
    fetch("/api/session")
      .then((r) => r.json())
      .then((j) => {
        if (j.verified && String(j.address || "").toLowerCase() === address.toLowerCase()) setVerified(true);
      })
      .catch(() => {});
  }, [address]);

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
      const next = accounts[0] || null;
      setAddress(next);
      const id = (await provider.request({ method: "eth_chainId" })) as string;
      setChainId(id);
      return next;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return null;
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

  const signMessage = useCallback(
    async (message: string) => {
      const provider = getProvider();
      if (!provider || !address) throw new Error("Connect Phantom first.");
      try {
        return String(await provider.request({ method: "personal_sign", params: [stringToHex(message), address] }));
      } catch {
        return String(await provider.request({ method: "personal_sign", params: [message, address] }));
      }
    },
    [address],
  );

  const verifyOwnership = useCallback(async () => {
    if (!address) throw new Error("Connect Phantom first.");
    setVerifying(true);
    setError(null);
    try {
      const nonceRes = await fetch(`/api/session/nonce?address=${encodeURIComponent(address)}`);
      const nonceJson = await nonceRes.json();
      if (!nonceRes.ok) throw new Error(nonceJson.error || "Could not issue a nonce.");
      const signature = await signMessage(String(nonceJson.message));
      const verifyRes = await fetch("/api/session/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          address,
          message: nonceJson.message,
          signature,
          nonce: nonceJson.nonce,
        }),
      });
      const verifyJson = await verifyRes.json();
      if (!verifyRes.ok) throw new Error(verifyJson.error || "Signature was rejected.");
      setVerified(true);
      return true;
    } catch (e) {
      setVerified(false);
      setError(e instanceof Error ? e.message : String(e));
      return false;
    } finally {
      setVerifying(false);
    }
  }, [address, signMessage]);

  const logoutSession = useCallback(async () => {
    await fetch("/api/session/logout", { method: "POST" }).catch(() => {});
    setVerified(false);
  }, []);

  const value = useMemo(
    () => ({
      address,
      chainId,
      connecting,
      error,
      verified,
      verifying,
      solanaAdapter,
      connect,
      addChain,
      signLaunch,
      signMessage,
      verifyOwnership,
      logoutSession,
    }),
    [
      address,
      chainId,
      connecting,
      error,
      verified,
      verifying,
      solanaAdapter,
      connect,
      addChain,
      signLaunch,
      signMessage,
      verifyOwnership,
      logoutSession,
    ],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWallet() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useWallet needs WalletProvider");
  return ctx;
}
