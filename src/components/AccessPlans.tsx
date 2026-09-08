"use client";

import { ACCESS_PLANS, MCP_ACCESS, mcpGatingEnabled } from "@/lib/access";
import { CANONICAL_MCP } from "@/lib/site";
import Link from "next/link";

export function AccessPlans() {
  const gated = mcpGatingEnabled();
  const rentals = ACCESS_PLANS.filter((p) => p.kind === "rental");
  const perm = ACCESS_PLANS.find((p) => p.kind === "permanent");

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-gold/30 bg-black/40 px-4 py-3 text-sm text-ivory/85">
        <p className="kicker text-gold">Live status</p>
        <p className="mt-2">
          MCP is <span className="text-gold">public</span> at {CANONICAL_MCP} · auth{" "}
          <span className="font-mono">{gated ? "gated (env)" : "none"}</span>.
        </p>
        <p className="mt-2 text-ivory/70">{MCP_ACCESS.note}</p>
      </div>

      <section>
        <h2 className="font-heading text-2xl text-ivory">Rental access (intent)</h2>
        <p className="mt-2 text-sm text-ivory/75">
          Intended periods if {MCP_ACCESS.tokenTicker} burn-gating ships. Amounts are not published. No plan can be
          purchased here.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rentals.map((p) => (
            <article key={p.id} className="panel rounded-xl p-5">
              <p className="kicker">Rental</p>
              <h3 className="mt-2 font-display text-2xl text-ivory">{p.label}</h3>
              <p className="mt-1 text-sm text-ivory/70">{p.duration}</p>
              <p className="mt-3 text-xs uppercase tracking-[0.16em] text-ember">Not live</p>
              <button type="button" disabled className="btn-ghost mt-4 w-full cursor-not-allowed opacity-50">
                Burn to unlock — unavailable
              </button>
            </article>
          ))}
        </div>
      </section>

      {perm ? (
        <section className="panel rounded-xl p-6">
          <p className="kicker">Permanent</p>
          <h2 className="mt-2 font-display text-3xl text-ivory">{perm.label}</h2>
          <p className="mt-2 max-w-xl text-sm text-ivory/75">
            Intended for long-lived integrations, infrastructure, and agents that should not renew a rental. Still not
            for sale. A burn would have to be verified on-chain before this card could ever say “unlocked”.
          </p>
          <button type="button" disabled className="btn-ghost mt-4 cursor-not-allowed opacity-50">
            Permanent unlock — unavailable
          </button>
        </section>
      ) : null}

      <section className="glass-2 p-5">
        <p className="kicker">{MCP_ACCESS.tokenTicker} utility</p>
        <p className="mt-2 text-sm leading-relaxed text-ivory/80">
          The intended loop is: more integrations → more MCP demand → more access purchased → more tokens burned. That
          loop is <strong className="font-medium text-ivory">not running</strong>. This page does not show a burn total.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/connect" className="btn-primary">
            Connect MCP now
          </Link>
          <Link href="/developers/partners" className="btn-ghost">
            Partner instead
          </Link>
        </div>
      </section>
    </div>
  );
}
