"use client";

import { useState } from "react";

type Status = {
  wallet?: string;
  sol?: number;
  orbitx?: number;
  ready?: boolean;
  notesEnabled?: boolean;
  autoBurnEnabled?: boolean;
  maxDailyBurnUsd?: number;
  maxDailySolSpend?: number;
  spentTodayUsd?: number;
  spentTodaySol?: number;
  stats?: { totalMemos?: number; totalBuys?: number; orbitxBurned?: number; totalBurnedUsd?: number };
};

type Activity = {
  id: string;
  event_type: string;
  status: string;
  usd_value?: number | null;
  token_amount?: number | null;
  transaction_signature?: string | null;
  created_at: string;
  note_id?: string | null;
};

export function OnchainAdmin({ secret }: { secret: string }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [burnUsd, setBurnUsd] = useState("50");
  const [solCap, setSolCap] = useState("1");

  async function load() {
    const res = await fetch("/api/admin/onchain", { headers: { "x-apogee-admin": secret } });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Failed to load on-chain admin");
      return;
    }
    setError(null);
    setStatus(json.status);
    setActivity(json.activity || []);
  }

  async function act(action: string, extra: Record<string, unknown> = {}) {
    const res = await fetch("/api/admin/onchain", {
      method: "POST",
      headers: { "content-type": "application/json", "x-apogee-admin": secret },
      body: JSON.stringify({ action, ...extra }),
    });
    const json = await res.json();
    if (!res.ok) setError(json.error || "Action failed");
    else await load();
  }

  return (
    <section className="panel rounded-xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="kicker">On-chain notes + burn</p>
        <button type="button" className="btn-ghost text-xs" onClick={() => void load()}>
          Load on-chain
        </button>
      </div>
      {error ? <p className="mt-2 text-sm text-flare">{error}</p> : null}
      {status ? (
        <>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4 text-sm">
            <p>Wallet · <span className="font-mono">{status.wallet}</span></p>
            <p>SOL · {status.sol}</p>
            <p>$ORBITX · {status.orbitx}</p>
            <p>Ready · {status.ready ? "yes" : "no key"}</p>
            <p>Notes · {status.notesEnabled ? "on" : "paused"}</p>
            <p>Auto-burn · {status.autoBurnEnabled ? "on" : "paused"}</p>
            <p>Memos · {status.stats?.totalMemos ?? 0}</p>
            <p>Burned USD · ${status.stats?.totalBurnedUsd ?? 0}</p>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="btn-ghost text-xs" onClick={() => void act(status.notesEnabled ? "pause_notes" : "resume_notes")}>
              {status.notesEnabled ? "Pause notes" : "Resume notes"}
            </button>
            <button type="button" className="btn-ghost text-xs" onClick={() => void act(status.autoBurnEnabled ? "pause_burns" : "resume_burns")}>
              {status.autoBurnEnabled ? "Pause auto-burn" : "Resume auto-burn"}
            </button>
            <button type="button" className="btn-ghost text-xs" onClick={() => void act("recover")}>
              Retry pending
            </button>
            <button type="button" className="btn-ghost text-xs" onClick={() => void act("burn_orbitx")}>
              Burn held $ORBITX
            </button>
          </div>
          <p className="mt-2 text-[11px] text-ivory/50">
            Pending buy/burn retries after each note, from Retry pending, and once daily via Vercel (Hobby cron limit).
          </p>
          <form
            className="mt-3 flex flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void act("limits", { maxDailyBurnUsd: Number(burnUsd), maxDailySolSpend: Number(solCap) });
            }}
          >
            <input className="field w-28 rounded-xl" value={burnUsd} onChange={(e) => setBurnUsd(e.target.value)} aria-label="Max daily burn USD" />
            <input className="field w-28 rounded-xl" value={solCap} onChange={(e) => setSolCap(e.target.value)} aria-label="Max daily SOL" />
            <button type="submit" className="btn-primary text-xs">
              Save daily caps
            </button>
          </form>
          <ul className="mt-4 max-h-64 space-y-1 overflow-auto text-[12px]">
            {activity.map((a) => (
              <li key={a.id} className="flex justify-between gap-2 border-b border-white/10 py-1">
                <span>
                  {a.event_type} · {a.status}
                  {a.transaction_signature ? (
                    <a className="ml-2 text-ember" href={`https://solscan.io/tx/${a.transaction_signature}`} target="_blank" rel="noreferrer">
                      tx
                    </a>
                  ) : null}
                </span>
                <span className="text-ivory/50">{new Date(a.created_at).toLocaleTimeString()}</span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="mt-2 text-sm text-ivory/60">Load on-chain to see the service wallet, kill switches, and event stream.</p>
      )}
    </section>
  );
}
