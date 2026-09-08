import { TOOLS } from "@/lib/tools";
import { mcpHttpUrl, PRODUCT } from "@/lib/site";

export default function UsagePage() {
  const url = mcpHttpUrl();
  return (
    <main className="mx-auto max-w-3xl px-5 pb-24 pt-28">
      <p className="text-[11px] uppercase tracking-[0.3em] text-gold">Operators</p>
      <h1 className="mt-2 font-display text-4xl">Usage</h1>
      <div className="mt-6 space-y-4 text-sm leading-relaxed text-ivory/75">
        <p>
          Canonical MCP: <code className="font-mono text-gold">{url}</code>. No account, no OAuth. {PRODUCT.toolCount}{" "}
          catalog operations; {TOOLS.length} listed for MCP clients. Connect Phantom on /orbit to sign pons launches —
          Apogee never holds keys.
        </p>
        <p>One-click setup lives at /connect for Cursor, Claude, ChatGPT, and Grok.</p>
        <p>Fair use: keep it to interactive agent workloads. Bursting thousands of uncached scans per minute may be throttled.</p>
        <p>Chain ID is 4663. DexScreener and GeckoTerminal use the slug <code className="font-mono">robinhood</code>.</p>
        <p>Never paste a private key into chat. prepare_pons_launch returns an unsigned tx for your wallet to sign.</p>
        <p>
          Example prompts: “Scan NVDA on Robinhood Chain and tell me if this contract is the canonical Stock Token.”
          “Track wallet 0x…” “What’s trending on RH chain in the last hour?” “Launch token named Ember ticker EMB.”
          “List pons launches and show graduation progress.”
        </p>
        <p>
          Launch data is read on-chain from pons factories (write pons lowercase;{" "}
          <a className="text-gold" href="https://www.ponsfamily.com/launchpad">
            app
          </a>
          ). Apogee is not operated by pons. Graduation is not a quality signal.
        </p>
        <p>
          REST: POST /api/v1 with {`{ "tool": "scan_token", "arguments": { "query": "NVDA" } }`} or GET
          /api/v1/scan_NVDA. Aliases like volume_1h and wallet_pnl_1 hit the 3000-op catalog.
        </p>
      </div>
    </main>
  );
}
