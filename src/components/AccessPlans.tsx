"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CANONICAL_MCP } from "@/lib/site";
import { MCP_ACCESS, PLAN_INCLUDES, type AccessPlan, type PlanQuote, type PurchaseState } from "@/lib/access";
import { useWallet } from "./WalletProvider";

type Catalog = {
  ok: boolean;
  live?: {
    auth: string;
    status: string;
    gating: boolean;
    payments: boolean;
    burnVerifier: boolean;
    checkout: string;
  };
  burnBps?: number;
  opsBps?: number;
  tokenTicker?: string;
  burnProcess?: string;
  includes?: string[];
  plans?: PlanQuote[];
  blocker?: { state: string; reason: string } | null;
};

const STATE_COPY: Record<PurchaseState, string> = {
  select_plan: "Select a plan",
  connect_wallet: "Connect wallet",
  verify_wallet: "Verify wallet ownership",
  breakdown: "Review purchase breakdown",
  waiting_wallet: "Waiting for wallet",
  awaiting_confirmation: "Awaiting confirmation",
  transaction_submitted: "Transaction submitted",
  confirming: "Confirming",
  purchase_confirmed: "Purchase confirmed",
  access_activated: "Access activated",
  buy_burn_processing: "Buy & burn processing",
  burn_verified: "Burn verified",
  complete: "Complete",
  rejected: "Rejected",
  expired: "Expired",
  failed: "Failed",
  insufficient_balance: "Insufficient balance",
  transaction_not_found: "Transaction not found",
  burn_verification_failed: "Burn verification failed",
  unavailable: "Checkout unavailable",
};

function usd(n: number) {
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

export function AccessPlans() {
  const { address, connect, connecting, verified, verifying, verifyOwnership, error } = useWallet();
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [selected, setSelected] = useState<PlanQuote | null>(null);
  const [state, setState] = useState<PurchaseState>("select_plan");
  const [detail, setDetail] = useState<string>("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/access/plans")
      .then((r) => r.json())
      .then(setCatalog)
      .catch((e) => setCatalog({ ok: false, blocker: { state: "unavailable", reason: String(e) } }));
  }, []);

  const rentals = useMemo(() => (catalog?.plans || []).filter((p) => p.plan.kind === "rental"), [catalog]);
  const lifetime = useMemo(() => (catalog?.plans || []).find((p) => p.plan.kind === "lifetime"), [catalog]);

  function openPlan(quote: PlanQuote) {
    setSelected(quote);
    setState("breakdown");
    setDetail("");
    void fetch("/api/analytics/event", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ event: "plan_view", meta: { planId: quote.plan.id } }),
    }).catch(() => {});
  }

  async function confirm() {
    if (!selected) return;
    setBusy(true);
    setDetail("");
    try {
      if (!address) {
        setState("connect_wallet");
        setState("waiting_wallet");
        const next = await connect();
        if (!next) {
          setState("failed");
          setDetail("Wallet connection was cancelled or failed.");
          return;
        }
      }
      if (!verified) {
        setState("verify_wallet");
        const ok = await verifyOwnership();
        if (!ok) {
          setState("rejected");
          setDetail("Wallet signature was not verified. A pasted address is not proof of ownership.");
          return;
        }
      }
      setState("awaiting_confirmation");
      const res = await fetch("/api/access/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ planId: selected.plan.id }),
      });
      const json = await res.json();
      setState((json.state as PurchaseState) || "unavailable");
      setDetail(
        [
          json.reason,
          json.purchaseId ? `Quote id ${json.purchaseId} stored as quoted — not confirmed.` : json.persisted === false ? "Quote was not persisted (service role missing)." : "",
          json.quote ? `Server price ${usd(json.quote.plan.priceUsd)} · burn allocation ${usd(json.quote.burnUsd)}.` : "",
        ]
          .filter(Boolean)
          .join(" "),
      );
    } catch (e) {
      setState("failed");
      setDetail(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  if (!catalog) {
    return <p className="text-sm text-ivory/70">Loading access catalog…</p>;
  }

  return (
    <div className="space-y-10">
      <div className="rounded-xl border border-gold/30 bg-black/40 px-4 py-4 text-sm text-ivory/85">
        <p className="kicker text-gold">Live MCP status</p>
        <p className="mt-2">
          <span className="mr-2 inline-block h-2 w-2 rounded-full bg-emerald-400" aria-hidden />
          PUBLIC · auth <span className="font-mono">{catalog.live?.auth || MCP_ACCESS.liveAuth}</span> · {CANONICAL_MCP}
        </p>
        <p className="mt-2 text-ivory/70">{MCP_ACCESS.note}</p>
      </div>

      <section id="allocation" className="panel overflow-hidden rounded-2xl p-5 sm:p-7">
        <p className="kicker">Where does the money go?</p>
        <h2 className="mt-2 font-display text-3xl text-ivory">100% MCP revenue</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-ember/40 bg-gradient-to-br from-[#5a1a12]/50 to-black/40 p-5">
            <p className="font-mono text-3xl text-gold">25%</p>
            <p className="mt-1 text-sm font-medium text-ivory">{MCP_ACCESS.tokenTicker} buy &amp; burn</p>
            <p className="mt-2 text-xs leading-relaxed text-ivory/70">
              Allocated after a purchase is confirmed. The UI says Burned only after a verified on-chain signature exists.
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-5">
            <p className="font-mono text-3xl text-ivory">75%</p>
            <p className="mt-1 text-sm font-medium text-ivory">Marketing + development + infrastructure</p>
            <p className="mt-2 text-xs leading-relaxed text-ivory/70">
              Building Apogee, MCP maintenance, partnerships, and operations.
            </p>
          </div>
        </div>
        <p className="mt-4 text-xs leading-relaxed text-ivory/65">{catalog.burnProcess || MCP_ACCESS.burnProcess}</p>
      </section>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="kicker">Rental access</p>
            <h2 className="mt-1 font-display text-3xl text-ivory">MCP Access Shop</h2>
          </div>
          <p className="text-xs text-ivory/55">Prices from the backend catalog. Frontend amounts are never trusted.</p>
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {rentals.map((q) => (
            <PlanCard key={q.plan.id} quote={q} includes={catalog.includes || [...PLAN_INCLUDES]} onSelect={() => openPlan(q)} />
          ))}
        </div>
      </section>

      {lifetime ? (
        <section className="relative overflow-hidden rounded-2xl border border-gold/35 bg-gradient-to-br from-[#3a160c] via-[#12080a] to-black p-6 sm:p-8">
          <p className="kicker text-gold">Lifetime access</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-gold/40 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-gold">
              One-time purchase
            </span>
            <span className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-ivory/80">
              Never expires
            </span>
          </div>
          <h2 className="mt-3 font-display text-4xl text-ivory sm:text-5xl">{lifetime.plan.label}</h2>
          <p className="mt-2 font-mono text-3xl text-gold">{usd(lifetime.plan.priceUsd)}</p>
          <p className="mt-2 max-w-xl text-sm text-ivory/75">{lifetime.plan.durationCopy}.</p>
          <p className="mt-3 text-sm text-ivory/70">
            {usd(lifetime.burnUsd)} → {MCP_ACCESS.tokenTicker} buy &amp; burn · {usd(lifetime.opsUsd)} → building Apogee
          </p>
          <button type="button" className="btn-primary mt-6" onClick={() => openPlan(lifetime)}>
            {lifetime.plan.cta}
          </button>
        </section>
      ) : null}

      {selected ? (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/75 p-0 sm:items-center sm:p-4" role="dialog" aria-modal>
          <div className="glass-3 max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl p-5 sm:rounded-2xl sm:p-7">
            <p className="kicker">{selected.plan.kind === "lifetime" ? "Lifetime" : "Rental"}</p>
            <h3 className="mt-2 font-display text-3xl text-ivory">{selected.plan.label}</h3>
            <p className="mt-1 font-mono text-2xl text-gold">{usd(selected.plan.priceUsd)}</p>
            <p className="mt-1 text-sm text-ivory/70">{selected.plan.durationCopy}</p>
            <dl className="mt-5 space-y-2 text-sm">
              <Row k="You are purchasing" v={`${selected.plan.label} MCP Access`} />
              <Row k="Price" v={usd(selected.plan.priceUsd)} />
              <Row k="Buy & burn allocation (25%)" v={usd(selected.burnUsd)} />
              <Row k="Remaining allocation (75%)" v={usd(selected.opsUsd)} />
              <Row k="Wallet" v={address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "Not connected"} />
              <Row k="Payment method" v="On-chain (not configured)" />
              <Row k="Ownership" v={verified ? "Verified signature" : "Unverified"} />
            </dl>
            <ul className="mt-4 list-disc space-y-1 pl-5 text-xs text-ivory/70">
              {(catalog.includes || PLAN_INCLUDES).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className="mt-4 rounded-lg border border-white/10 bg-black/30 p-3 text-xs leading-relaxed text-ivory/70">
              Confirming asks the backend for this plan’s server price and will not broadcast a payment. Access is not
              activated from a quoted intent. Burns are never marked verified without an on-chain signature.
            </p>
            {state !== "select_plan" && state !== "breakdown" ? (
              <p className="mt-4 text-sm text-gold">
                {STATE_COPY[state]}
                {detail ? <span className="mt-2 block text-ivory/75">{detail}</span> : null}
              </p>
            ) : null}
            {error ? <p className="mt-2 text-sm text-flare">{error}</p> : null}
            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <button type="button" disabled={busy || connecting || verifying} className="btn-primary flex-1" onClick={confirm}>
                {busy ? "Working…" : connecting || verifying ? "Waiting for wallet…" : "Confirm purchase"}
              </button>
              <button
                type="button"
                className="btn-ghost flex-1"
                onClick={() => {
                  setSelected(null);
                  setState("select_plan");
                }}
              >
                Close
              </button>
            </div>
            <p className="mt-3 text-[11px] text-ivory/50">
              No transaction is submitted without an explicit wallet approval. Today the rail stops before a payment tx.
            </p>
          </div>
        </div>
      ) : null}

      <p className="text-xs text-ivory/55">
        Need a partnership conversation instead of a future paid grant?{" "}
        <Link href="/developers/partners" className="text-ember hover:text-ivory">
          Partner with Apogee
        </Link>
        . Connect MCP now at{" "}
        <Link href="/connect" className="text-ember hover:text-ivory">
          /connect
        </Link>
        .
      </p>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/8 py-2">
      <dt className="text-ivory/55">{k}</dt>
      <dd className="text-right text-ivory">{v}</dd>
    </div>
  );
}

function PlanCard({
  quote,
  includes,
  onSelect,
}: {
  quote: PlanQuote;
  includes: readonly string[];
  onSelect: () => void;
}) {
  const plan: AccessPlan = quote.plan;
  return (
    <article className="panel relative rounded-2xl p-5 sm:p-6">
      {plan.recommended ? (
        <span className="absolute right-4 top-4 rounded-full border border-gold/40 bg-gold/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-gold">
          Recommended
        </span>
      ) : null}
      <p className="kicker">Rental</p>
      <h3 className="mt-2 font-display text-3xl text-ivory">{plan.label}</h3>
      <p className="mt-1 font-mono text-2xl text-gold">${plan.priceUsd.toLocaleString("en-US")}</p>
      <p className="mt-1 text-sm text-ivory/70">{plan.durationCopy}</p>
      <p className="mt-3 text-xs text-ivory/60">
        ${quote.burnUsd.toLocaleString("en-US")} buy &amp; burn · ${quote.opsUsd.toLocaleString("en-US")} ops
      </p>
      <p className="mt-4 text-[11px] uppercase tracking-[0.16em] text-ivory/45">Includes</p>
      <ul className="mt-2 space-y-1 text-sm text-ivory/75">
        {includes.map((item) => (
          <li key={item}>· {item}</li>
        ))}
      </ul>
      <button type="button" className="btn-primary mt-5 w-full" onClick={onSelect}>
        {plan.cta}
      </button>
    </article>
  );
}
