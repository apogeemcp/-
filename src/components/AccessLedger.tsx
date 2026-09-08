"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { remainingCopy } from "@/lib/access";
import { shortAddress } from "@/lib/chain";
import { useWallet } from "./WalletProvider";

type Grant = {
  id: string;
  plan_id: string;
  starts_at: string;
  expires_at: string | null;
  lifetime: boolean;
  status: string;
  purchase_id?: string;
};
type Purchase = {
  id: string;
  plan_label?: string;
  plan_id: string;
  price_usd: number;
  burn_usd: number;
  status: string;
  verification_status: string;
  tx_signature?: string | null;
  created_at: string;
  wallet?: string | null;
};
type Burn = {
  id: string;
  allocation_usd: number;
  burn_amount?: number | null;
  burn_tx?: string | null;
  buy_tx?: string | null;
  verified: boolean;
  status: string;
  created_at: string;
};

export function AccessLedger() {
  const { address, verified, connect, verifyOwnership, verifying } = useWallet();
  const [data, setData] = useState<{
    grants: Grant[];
    purchases: Purchase[];
    burns: Burn[];
  }>({ grants: [], purchases: [], burns: [] });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/access/status")
      .then((r) => r.json())
      .then((j) => {
        setData({
          grants: j.grants || [],
          purchases: j.purchases || [],
          burns: j.burns || [],
        });
      })
      .finally(() => setLoaded(true));
  }, [verified]);

  const active = data.grants.filter((g) => g.status === "active");
  const verifiedBurns = data.burns.filter((b) => b.verified && b.burn_tx);

  return (
    <div className="space-y-8">
      {!address ? (
        <button type="button" className="btn-primary" onClick={() => connect()}>
          Connect wallet to load history
        </button>
      ) : !verified ? (
        <button type="button" className="btn-ghost" onClick={() => verifyOwnership()} disabled={verifying}>
          {verifying ? "Waiting for signature…" : "Sign to verify this wallet"}
        </button>
      ) : null}

      <section>
        <h2 className="font-heading text-2xl text-ivory">Access</h2>
        {!loaded ? <p className="mt-2 text-sm text-ivory/70">Loading…</p> : null}
        {loaded && active.length === 0 ? (
          <div className="panel mt-3 rounded-xl p-5">
            <p className="text-sm text-ivory/80">
              No purchased MCP grant. Live MCP is still public (auth none). History is not deleted when a future rental
              expires.
            </p>
            <Link href="/developers/access" className="btn-primary mt-4 inline-flex">
              View access shop
            </Link>
          </div>
        ) : null}
        <ul className="mt-3 space-y-3">
          {data.grants.map((g) => {
            const expired = g.expires_at ? new Date(g.expires_at).getTime() <= Date.now() : false;
            const remain = remainingCopy(g.expires_at);
            return (
              <li key={g.id} className="panel rounded-xl p-5">
                <p className="kicker">{g.lifetime ? "Lifetime" : "Rental"}</p>
                <p className="mt-1 font-heading text-xl text-ivory">MCP — {g.plan_id}</p>
                <p className="mt-2 text-sm text-ivory/75">Purchased {new Date(g.starts_at).toLocaleDateString()}</p>
                {g.lifetime ? (
                  <p className="mt-1 text-sm text-emerald-300">ACTIVE — NEVER EXPIRES</p>
                ) : expired ? (
                  <p className="mt-1 text-sm text-flare">MCP ACCESS EXPIRED</p>
                ) : (
                  <p className="mt-1 text-sm text-emerald-300">
                    ACTIVE · expires {g.expires_at ? new Date(g.expires_at).toLocaleDateString() : "—"} · {remain}
                  </p>
                )}
                {expired ? (
                  <Link href="/developers/access" className="btn-primary mt-3 inline-flex">
                    Renew access
                  </Link>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <h2 className="font-heading text-2xl text-ivory">Purchase history</h2>
        {data.purchases.length === 0 ? (
          <p className="mt-2 text-sm text-ivory/70">No purchase rows for this wallet. Quoted intents appear here if stored.</p>
        ) : (
          <ul className="mt-3 grid gap-3">
            {data.purchases.map((p) => (
              <li key={p.id} className="panel rounded-xl p-4 sm:hidden">
                <p className="text-ivory">{p.plan_label || p.plan_id}</p>
                <p className="text-sm text-ivory/70">{new Date(p.created_at).toLocaleString()}</p>
                <p className="mt-1 font-mono text-gold">${Number(p.price_usd).toLocaleString()}</p>
                <p className="text-xs text-ivory/60">${Number(p.burn_usd).toLocaleString()} buy &amp; burn · {p.status}</p>
                <p className="text-xs text-ivory/50">{p.wallet ? shortAddress(p.wallet) : "—"}</p>
                {p.tx_signature ? (
                  <p className="mt-1 font-mono text-xs text-ivory/70">tx {p.tx_signature}</p>
                ) : (
                  <p className="mt-1 text-xs text-ivory/50">No on-chain transaction</p>
                )}
              </li>
            ))}
          </ul>
        )}
        {data.purchases.length ? (
          <div className="mt-3 hidden overflow-x-auto sm:block">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead>
                <tr className="border-b border-white/15 text-ivory/60">
                  <th className="py-2">Date</th>
                  <th>Plan</th>
                  <th>Price</th>
                  <th>Allocation</th>
                  <th>Status</th>
                  <th>Burn</th>
                  <th>Tx</th>
                </tr>
              </thead>
              <tbody>
                {data.purchases.map((p) => (
                  <tr key={p.id} className="border-b border-white/10">
                    <td className="py-2 text-ivory/80">{new Date(p.created_at).toLocaleDateString()}</td>
                    <td>{p.plan_label || p.plan_id}</td>
                    <td className="font-mono">${Number(p.price_usd).toLocaleString()}</td>
                    <td className="text-ivory/70">${Number(p.burn_usd).toLocaleString()}</td>
                    <td>{p.status}</td>
                    <td>{p.verification_status}</td>
                    <td className="text-ivory/50">{p.tx_signature ? "on-chain" : "none"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <section>
        <h2 className="font-heading text-2xl text-ivory">Burn history</h2>
        <p className="mt-2 text-sm text-ivory/75">
          Total verified {MCP_TICKER} burned through this wallet: {verifiedBurns.length} events. Amounts display only when
          a burn transaction signature is stored.
        </p>
        {data.burns.length === 0 ? (
          <p className="mt-2 text-sm text-ivory/70">No burn records. Nothing is marked burned.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {data.burns.map((b) => (
              <li key={b.id} className="panel rounded-xl p-4">
                <p className="kicker">MCP purchase</p>
                <p className="mt-1 text-ivory">${Number(b.allocation_usd).toLocaleString()} allocated</p>
                <p className="text-sm text-ivory/70">
                  {b.verified && b.burn_tx ? "VERIFIED" : "Not burned — awaiting a verified transaction"}
                </p>
                {b.burn_tx ? (
                  <p className="mt-1 break-all font-mono text-xs text-gold">{b.burn_tx}</p>
                ) : (
                  <p className="mt-1 text-xs text-ivory/50">No explorer link — no signature.</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

const MCP_TICKER = "$ORBITX";
