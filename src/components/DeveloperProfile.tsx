"use client";

import { useEffect, useState } from "react";
import { MCP_ACCESS } from "@/lib/access";
import { CHAIN, shortAddress } from "@/lib/chain";
import { useRole } from "./RoleProvider";
import { useWallet } from "./WalletProvider";

type Profile = {
  display_name?: string | null;
  username?: string | null;
  bio?: string | null;
  role?: string | null;
  created_at?: string | null;
  last_login?: string | null;
};

export function DeveloperProfile() {
  const { address, chainId, verified, verifying, connect, verifyOwnership, logoutSession, solanaAdapter, error } = useWallet();
  const { role, setRole, openPrompt } = useRole();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ totals?: { purchases: number; verifiedBurnAmount: number; activeGrants: number } } | null>(
    null,
  );

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((j) => {
        const p = j.profile as Profile | null;
        setProfile(p);
        if (p?.display_name) setDisplayName(p.display_name);
        if (p?.username) setUsername(p.username);
        if (p?.bio) setBio(p.bio);
      })
      .catch(() => {});
    fetch("/api/access/status")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => {});
  }, [verified]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ displayName, username, bio, role: role || "developer" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Save failed");
      setMsg("Profile saved.");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-3 sm:grid-cols-2">
        <div className="panel rounded-xl p-5">
          <p className="kicker">Identity</p>
          <p className="mt-2 text-sm text-ivory/75">One profile. Trader and developer are roles, not separate accounts.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className={`btn-ghost ${role === "trader" ? "border-ember/50" : ""}`} onClick={() => setRole("trader", { navigate: false })}>
              Trader
            </button>
            <button type="button" className={`btn-ghost ${role === "developer" ? "border-ember/50" : ""}`} onClick={() => setRole("developer", { navigate: false })}>
              Developer
            </button>
            <button type="button" className="btn-ghost" onClick={openPrompt}>
              Welcome screen
            </button>
          </div>
        </div>
        <div className="panel rounded-xl p-5">
          <p className="kicker">MCP status</p>
          <p className="mt-2 text-ivory">Public · auth none</p>
          <p className="mt-1 text-sm text-ivory/70">Purchased grants: {status?.totals?.activeGrants ?? 0}</p>
          <p className="mt-1 text-sm text-ivory/70">
            {MCP_ACCESS.tokenTicker} verified burned: {status?.totals?.verifiedBurnAmount ?? 0}
          </p>
        </div>
      </section>

      <section className="panel rounded-xl p-5">
        <p className="kicker">Wallets</p>
        {!address ? (
          <button type="button" className="btn-primary mt-3" onClick={() => connect()}>
            Connect Phantom
          </button>
        ) : (
          <div className="mt-3 space-y-2 text-sm">
            <p>
              Primary wallet <span className="font-mono text-gold">{shortAddress(address)}</span>
            </p>
            <p>Chain {CHAIN.name} ({CHAIN.id}) · wallet type Phantom / EIP-1193</p>
            <p>{verified ? "Verified signature" : "Connected — not verified until you sign the challenge"}</p>
            <p>Connection uses Ethereum mode. Solana adapter {solanaAdapter ? "detected" : "not detected"} — Solana ownership is not verified in this app.</p>
            <p className="text-ivory/60">Last used: this session · {chainId || "chain unknown"}</p>
            <div className="flex flex-wrap gap-2 pt-2">
              {!verified ? (
                <button type="button" className="btn-primary" onClick={() => verifyOwnership()} disabled={verifying}>
                  {verifying ? "Waiting for wallet…" : "Verify ownership"}
                </button>
              ) : (
                <button type="button" className="btn-ghost" onClick={() => logoutSession()}>
                  End verified session
                </button>
              )}
            </div>
            {error ? <p className="text-flare">{error}</p> : null}
          </div>
        )}
      </section>

      <form onSubmit={save} className="panel space-y-4 rounded-xl p-5">
        <p className="kicker">Developer profile</p>
        <label className="block text-sm">
          Display name
          <input className="field mt-1 w-full rounded-xl" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={80} />
        </label>
        <label className="block text-sm">
          Username
          <input className="field mt-1 w-full rounded-xl" value={username} onChange={(e) => setUsername(e.target.value)} maxLength={40} />
        </label>
        <label className="block text-sm">
          Bio
          <textarea className="field mt-1 w-full rounded-xl" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={500} rows={4} />
        </label>
        <p className="text-xs text-ivory/55">
          Account created {profile?.created_at ? new Date(profile.created_at).toLocaleString() : "after first verified save"}. Last
          login {profile?.last_login ? new Date(profile.last_login).toLocaleString() : "—"}.
        </p>
        {msg ? <p className="text-sm text-gold">{msg}</p> : null}
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? "Saving…" : "Save profile"}
        </button>
        <p className="text-xs text-ivory/50">Saving requires a verified wallet session. Secrets are not stored in the browser.</p>
      </form>

      <section className="panel rounded-xl p-5">
        <p className="kicker">Credentials</p>
        <p className="mt-2 text-sm text-ivory/75">
          Live MCP is auth none. There is no API key, OAuth client, or rotate/revoke console because the server does not
          issue credentials. Do not paste third-party keys here.
        </p>
      </section>

      <section className="panel rounded-xl p-5">
        <p className="kicker">Purchases</p>
        <p className="mt-2 text-sm text-ivory/75">Total purchase rows: {status?.totals?.purchases ?? 0}. Confirmed spend: $0 until verification exists.</p>
      </section>
    </div>
  );
}
