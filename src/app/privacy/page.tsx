const updated = "September 7, 2026";

export default function PrivacyPage() {
  return (
    <Legal
      title="Privacy Policy"
      updated={updated}
      body={[
        "Apogee is a public, no-login Model Context Protocol server and website for Robinhood Chain market data.",
        "We do not create user accounts. We do not ask for names, emails, passwords, seed phrases, or private keys.",
        "When you or an AI client call Apogee tools, we may log the tool name, query string (ticker or public address), timestamp, and coarse result metadata so we can keep the APIs reliable. We do not intend to log IP addresses beyond what our hosting providers retain in ordinary access logs.",
        "Data sources include public RPC nodes, DexScreener, GeckoTerminal, DefiLlama, and Robinhood's public RHJ Stock Token APIs. Those providers have their own policies.",
        "If we store scan history in Supabase, it is for anonymous product telemetry and caching — not advertising profiles.",
        "Cookies: the marketing site does not require cookies for the MCP to work. Optional analytics, if added later, will be disclosed here.",
        "Contact: open an issue on the Apogee GitHub repository.",
      ]}
    />
  );
}

function Legal({ title, updated, body }: { title: string; updated: string; body: string[] }) {
  return (
    <main className="mx-auto max-w-3xl px-5 pb-24 pt-28">
      <p className="text-[11px] uppercase tracking-[0.3em] text-gold">Legal</p>
      <h1 className="mt-2 font-display text-4xl">{title}</h1>
      <p className="mt-2 text-sm text-ivory/50">Last updated {updated}</p>
      <div className="mt-8 space-y-4 text-sm leading-relaxed text-ivory/75">
        {body.map((p) => (
          <p key={p.slice(0, 40)}>{p}</p>
        ))}
      </div>
    </main>
  );
}
