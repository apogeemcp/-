"use client";

import { useState } from "react";

type Hub = Record<string, unknown> & { ok?: boolean; error?: string };

export function AdminHub() {
  const [secret, setSecret] = useState("");
  const [data, setData] = useState<Hub | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [burnId, setBurnId] = useState("");
  const [burnLink, setBurnLink] = useState("");

  async function load(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/hub", { headers: { "x-apogee-admin": secret } });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setData(json);
      try {
        sessionStorage.setItem("apogee-admin", secret);
      } catch {
        /* ignore */
      }
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function reload() {
    const form = document.getElementById("admin-load") as HTMLFormElement | null;
    form?.requestSubmit();
  }

  async function setPartnerStatus(id: string, status: string) {
    const res = await fetch("/api/admin/partners", {
      method: "PATCH",
      headers: { "content-type": "application/json", "x-apogee-admin": secret },
      body: JSON.stringify({ id, status }),
    });
    const json = await res.json();
    if (!res.ok) setError(json.error || "Update failed");
    else await reload();
  }

  async function activate(id: string) {
    const res = await fetch("/api/admin/payments", {
      method: "POST",
      headers: { "content-type": "application/json", "x-apogee-admin": secret },
      body: JSON.stringify({ id, action: "activate" }),
    });
    const json = await res.json();
    if (!res.ok) setError(json.error || "Update failed");
    else await reload();
  }

  async function recordBurn(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/payments", {
      method: "POST",
      headers: { "content-type": "application/json", "x-apogee-admin": secret },
      body: JSON.stringify({ id: burnId, action: "record_burn", solscan: burnLink }),
    });
    const json = await res.json();
    if (!res.ok) setError(json.error || "Burn not recorded");
    else {
      setBurnId("");
      setBurnLink("");
      await reload();
    }
  }

  const revenue = data?.revenue as { totalUsd?: number; confirmedPurchases?: number; quotedOnly?: number; note?: string } | undefined;
  const access = data?.access as { activeRentals?: number; lifetime?: number; expiring?: number } | undefined;
  const orbitx = data?.orbitx as { burnedVerified?: number; pending?: number; failed?: number; note?: string } | undefined;
  const partners = data?.partners as { pending?: number; rows?: Array<{ id: string; company: string; status: string; created_at: string }> } | undefined;
  const payments = data?.payments as {
    rows?: Array<{ id: string; status: string; price_usd: number; plan_id: string; tx_signature?: string; created_at: string }>;
  } | undefined;
  const usage = data?.usage as { ok?: boolean; rows?: Array<{ tool: string; calls: number }> } | undefined;

  return (
    <div className="space-y-6">
      <form id="admin-load" onSubmit={load} className="panel flex flex-col gap-3 rounded-xl p-5 sm:flex-row">
        <input
          type="password"
          className="field flex-1 rounded-xl"
          placeholder="APOGEE_ADMIN_SECRET"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          autoComplete="off"
        />
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? "Loading…" : "Load"}
        </button>
      </form>
      {error ? <p className="text-sm text-flare">{error}</p> : null}
      {data?.ok ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card k="MCP revenue" v={`$${Number(revenue?.totalUsd || 0).toLocaleString()}`} d={`${revenue?.confirmedPurchases || 0} confirmed · ${revenue?.quotedOnly || 0} quoted`} />
            <Card k="Access" v={`${access?.activeRentals || 0} rentals`} d={`${access?.lifetime || 0} lifetime · ${access?.expiring || 0} expiring <7d`} />
            <Card k="$ORBITX" v={`${orbitx?.burnedVerified || 0} verified`} d={`${orbitx?.pending || 0} pending · ${orbitx?.failed || 0} failed`} />
            <Card k="Partners" v={`${partners?.pending || 0} pending`} d="Review below" />
          </div>
          <p className="text-xs text-ivory/55">{revenue?.note}</p>
          <p className="text-xs text-ivory/55">{orbitx?.note}</p>
          <section className="panel rounded-xl p-5">
            <p className="kicker">Payments</p>
            <ul className="mt-3 space-y-2 text-sm">
              {(payments?.rows || []).map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 py-2">
                  <span className="min-w-0">
                    {p.plan_id} · ${Number(p.price_usd).toLocaleString()} · {p.status}
                    {p.tx_signature ? (
                      <a
                        className="ml-2 text-ember"
                        href={`https://solscan.io/tx/${p.tx_signature}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Solscan
                      </a>
                    ) : null}
                  </span>
                  {p.status !== "confirmed" ? (
                    <button type="button" className="btn-ghost text-xs" onClick={() => activate(p.id)}>
                      Grant access
                    </button>
                  ) : null}
                </li>
              ))}
              {!payments?.rows?.length ? <li className="text-ivory/60">No payment rows.</li> : null}
            </ul>
            <form onSubmit={recordBurn} className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <input className="field rounded-xl" placeholder="Purchase id" value={burnId} onChange={(e) => setBurnId(e.target.value)} />
              <input className="field rounded-xl" placeholder="Burn Solscan URL" value={burnLink} onChange={(e) => setBurnLink(e.target.value)} />
              <button type="submit" className="btn-primary">
                Record burn
              </button>
            </form>
            <p className="mt-2 text-xs text-ivory/55">
              Buy-and-burn is manual. Record the Solscan burn tx after you execute it. It will not show as Burned without a real signature.
            </p>
          </section>
          <section className="panel rounded-xl p-5">
            <p className="kicker">Partnerships</p>
            <ul className="mt-3 space-y-2 text-sm">
              {(partners?.rows || []).map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 py-2">
                  <span>
                    {p.company} · {p.status} · {new Date(p.created_at).toLocaleDateString()}
                  </span>
                  <span className="flex gap-1">
                    <button type="button" className="btn-ghost text-xs" onClick={() => setPartnerStatus(p.id, "accepted")}>
                      Accept
                    </button>
                    <button type="button" className="btn-ghost text-xs" onClick={() => setPartnerStatus(p.id, "declined")}>
                      Decline
                    </button>
                  </span>
                </li>
              ))}
              {!partners?.rows?.length ? <li className="text-ivory/60">No rows (or service role missing).</li> : null}
            </ul>
          </section>
          <section className="panel rounded-xl p-5">
            <p className="kicker">Usage (real telemetry)</p>
            <ul className="mt-3 space-y-1 text-sm">
              {(usage?.rows || []).slice(0, 12).map((r) => (
                <li key={r.tool} className="flex justify-between font-mono">
                  <span className="text-gold">{r.tool}</span>
                  <span>{r.calls}</span>
                </li>
              ))}
              {!usage?.rows?.length ? <li className="text-ivory/60">{usage?.ok === false ? "Usage not readable." : "No usage yet."}</li> : null}
            </ul>
          </section>
        </>
      ) : (
        <p className="text-sm text-ivory/70">
          Admin visibility is gated by a server secret. Burns stay unverified until you paste a real Solscan burn tx.
        </p>
      )}
    </div>
  );
}

function Card({ k, v, d }: { k: string; v: string; d: string }) {
  return (
    <div className="panel rounded-xl p-4">
      <p className="kicker">{k}</p>
      <p className="mt-2 font-heading text-xl text-ivory">{v}</p>
      <p className="mt-1 text-xs text-ivory/60">{d}</p>
    </div>
  );
}
