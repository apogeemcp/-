import { TOOLS } from "@/lib/tools";
import { publicSiteUrl } from "@/lib/site";

export default function UsagePage() {
  const url = `${publicSiteUrl()}/api/mcp`;
  return (
    <main className="mx-auto max-w-3xl px-5 pb-24 pt-28">
      <p className="text-[11px] uppercase tracking-[0.3em] text-gold">Operators</p>
      <h1 className="mt-2 font-display text-4xl">Usage</h1>
      <div className="mt-6 space-y-4 text-sm leading-relaxed text-ivory/75">
        <p>
          Point any MCP-capable client at <code className="font-mono text-gold">{url}</code>. No account, no OAuth, no
          wallet. Optional: use the hosted Supabase function listed on the desk.
        </p>
        <p>Fair use: keep it to interactive agent workloads. Bursting thousands of uncached scans per minute may be throttled.</p>
        <p>Chain ID is 4663. DexScreener and GeckoTerminal use the slug <code className="font-mono">robinhood</code>.</p>
        <p>Never paste a private key into chat. Apogee will not sign or broadcast transactions.</p>
        <p>
          Example prompts: “Scan NVDA on Robinhood Chain and tell me if this contract is the canonical Stock Token.”
          “What’s trending on RH chain in the last hour?” “List pons launches and show graduation progress.” “Desk
          snapshot.” “Is 0x39dBED… a pons v1 token, and has it graduated?”
        </p>
        <p>
          Launch data is read on-chain from pons factories (write pons lowercase;{" "}
          <a className="text-gold" href="https://www.ponsfamily.com/launchpad">
            app
          </a>
          ). Apogee is not operated by pons. Graduation is not a quality signal.
        </p>
        <p>{TOOLS.length} tools are listed on the docs page. REST mirror: POST /api/v1 with {`{ "tool": "scan_token", "arguments": { "query": "NVDA" } }`} or GET /api/v1/scan_token?query=NVDA.</p>
      </div>
    </main>
  );
}
