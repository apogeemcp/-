"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useWallet } from "./WalletProvider";

export type SiteRole = "trader" | "developer";
const ROLE_KEY = "apogee-role-v1";

type RoleState = {
  role: SiteRole | null;
  setRole: (role: SiteRole, opts?: { navigate?: boolean }) => void;
  promptOpen: boolean;
  openPrompt: () => void;
  dismissPrompt: () => void;
};

const Ctx = createContext<RoleState | null>(null);

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const { address } = useWallet();
  const [role, setRoleState] = useState<SiteRole | null>(null);
  const [promptOpen, setPromptOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    try {
      const stored = localStorage.getItem(ROLE_KEY);
      if (stored === "trader" || stored === "developer") setRoleState(stored);
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (address && !role) setPromptOpen(true);
  }, [address, role, ready]);

  const setRole = useCallback(
    (next: SiteRole, opts?: { navigate?: boolean }) => {
      setRoleState(next);
      try {
        localStorage.setItem(ROLE_KEY, next);
      } catch {
        /* ignore */
      }
      setPromptOpen(false);
      void fetch("/api/analytics/event", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ event: "role_selected", meta: { role: next } }),
      }).catch(() => {});
      void fetch("/api/profile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role: next }),
      }).catch(() => {});
      if (opts?.navigate !== false) {
        if (next === "developer" && !pathname.startsWith("/developers")) router.push("/developers");
        if (next === "trader" && pathname.startsWith("/developers")) router.push("/dashboard");
      }
    },
    [pathname, router],
  );

  const value = useMemo(
    () => ({
      role,
      setRole,
      promptOpen,
      openPrompt: () => setPromptOpen(true),
      dismissPrompt: () => setPromptOpen(false),
    }),
    [role, setRole, promptOpen],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      {promptOpen ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 p-4 sm:items-center" role="dialog" aria-modal aria-labelledby="role-title">
          <div className="glass-3 w-full max-w-lg p-6 sm:p-8">
            <p className="kicker">Welcome to Apogee</p>
            <h2 id="role-title" className="mt-2 font-display text-3xl text-ivory">
              How are you using Apogee?
            </h2>
            <p className="mt-2 text-sm text-ivory/75">
              One identity. You can change this later in Developer Hub → Profile. This is not a separate account.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                className="rounded-xl border border-white/10 bg-black/40 p-4 text-left hover:border-ember/50"
                onClick={() => setRole("trader")}
              >
                <p className="kicker">Trader</p>
                <p className="mt-2 font-heading text-xl text-ivory">Desk &amp; Orbit</p>
                <p className="mt-2 text-sm text-ivory/70">Scan, chart, launches, and the in-app assistant.</p>
              </button>
              <button
                type="button"
                className="rounded-xl border border-ember/40 bg-gradient-to-b from-[#3a1218]/80 to-black/60 p-4 text-left hover:border-gold/50"
                onClick={() => setRole("developer")}
              >
                <p className="kicker">Developer</p>
                <p className="mt-2 font-heading text-xl text-ivory">MCP Hub</p>
                <p className="mt-2 text-sm text-ivory/70">Integrate Apogee tools into your own product.</p>
              </button>
            </div>
            <button type="button" className="btn-ghost mt-4 w-full sm:w-auto" onClick={() => setPromptOpen(false)}>
              Decide later
            </button>
          </div>
        </div>
      ) : null}
    </Ctx.Provider>
  );
}

export function useRole() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useRole needs RoleProvider");
  return ctx;
}
