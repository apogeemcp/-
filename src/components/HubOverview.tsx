"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CANONICAL_MCP } from "@/lib/site";
import { MCP_ACCESS } from "@/lib/access";
import { useWallet } from "./WalletProvider";
import { useRole } from "./RoleProvider";
import { shortAddress } from "@/lib/chain";

type Status = {
  ok: boolean;
  wallet: string | null;
  verified: boolean;
  mcp: { auth: string; status: string; gating: boolean; payments: boolean };
  totals: { purchases: number; activeGrants: number; verifiedBurnEvents: number; verifiedBurnAmount: number };
  note?: string;
};

export function HubOverview() {
  const { address, verified, connect, connecting } = useWallet();
  const { role } = useRole();
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    fetch("/api/access/status")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus(null));
    void fetch("/api/analytics/event", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ event: "hub_open" }),
    }).catch(() => {});
  }, [verified]);

  const mcpLive = true;
  const purchased = (status?.totals.activeGrants || 0) > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-emerald-300">
          MCP active · public
        </span>
        {purchased ? (
          <span className="rounded-full border border-gold/40 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-gold">
            Purchased grant
          </span>
        ) : (
          <span className="rounded-full border border-white/15 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-ivory/70">
            No purchased grant
          </span>
        )}
        {role ? (
          <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-ivory/60">
            Role {role}
          </span>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat k="MCP status" v={mcpLive ? "PUBLIC" : "DOWN"} d={`auth ${status?.mcp.auth || MCP_ACCESS.liveAuth}`} />
        <Stat k="Access type" v="Ungated MCP" d="Paid rentals not activated" />
        <Stat k="Expires" v="Not applicable" d="Public endpoint has no expiry" />
        <Stat
          k="Wallet"
          v={address ? shortAddress(address) : "Not connected"}
          d={verified ? "Signature verified" : address ? "Connected, not signed" : "Phantom Ethereum mode"}
        />
        <Stat k={`${MCP_ACCESS.tokenTicker} burned`} v={String(status?.totals.verifiedBurnAmount ?? 0)} d="Verified burns only" />
        <Stat k="Purchases" v={String(status?.totals.purchases ?? 0)} d="Quoted intents included; none confirmed" />
        <Stat k="Integrations" v="0" d="No API keys — auth none" />
        <Stat k="Usage" v="Live" d="See Usage for real telemetry" />
      </div>

      {!address ? (
        <button type="button" className="btn-primary" onClick={() => connect()} disabled={connecting}>
          {connecting ? "Connecting…" : "Connect Phantom"}
        </button>
      ) : null}

      <p className="text-sm leading-relaxed text-ivory/75">
        Connect agents at <span className="font-mono text-gold">{CANONICAL_MCP}</span>. Paid grants appear after a
        verified SOL/USDC payment to the treasury. $ORBITX burns stay pending until that burn transaction is recorded.
      </p>
      <div className="flex flex-wrap gap-2">
        <Link href="/developers/access" className="btn-primary">
          MCP access shop
        </Link>
        <Link href="/onchain-notes" className="btn-ghost">
          On-chain notes
        </Link>
        <Link href="/developers/mcp" className="btn-ghost">
          MCP docs
        </Link>
        <Link href="/developers/tools" className="btn-ghost">
          Tools
        </Link>
      </div>
      {status?.note ? <p className="text-xs text-ivory/55">{status.note}</p> : null}
    </div>
  );
}

function Stat({ k, v, d }: { k: string; v: string; d: string }) {
  return (
    <div className="panel rounded-xl p-4">
      <p className="kicker">{k}</p>
      <p className="mt-2 font-heading text-xl text-ivory">{v}</p>
      <p className="mt-1 text-xs text-ivory/60">{d}</p>
    </div>
  );
}
