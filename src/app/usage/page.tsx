import { PageFrame, PageHero } from "@/components/PageHero";
import { TOOLS } from "@/lib/tools";
import { LEGAL, PRODUCT, mcpHttpUrl } from "@/lib/site";

export default function UsagePage() {
  const url = mcpHttpUrl();
  return (
    <main>
      <PageHero compact kicker="Operators" title="Usage" lede={`Updated ${LEGAL.updated}. Canonical MCP ${url}.`} />
      <PageFrame>
        <div className="panel space-y-4 rounded-xl p-6 text-sm leading-relaxed text-ivory/75 sm:p-8">
          <p>
            Point any MCP client at <code className="font-mono text-gold">{url}</code>. No account. {PRODUCT.toolCount}{" "}
            catalog operations; {TOOLS.length} listed. Phantom on /orbit signs pons launches locally.
          </p>
          <p>One-click setup is on /connect for Cursor, Claude, ChatGPT, and Grok.</p>
          <p>Fair use: interactive agent workloads. Bursting thousands of uncached scans per minute may be throttled.</p>
          <p>{LEGAL.data}</p>
          <p>{LEGAL.keys}</p>
          <p>{LEGAL.pons}</p>
          <p>{LEGAL.stock}</p>
          <p>
            Example prompts: “Scan NVDA and tell me if this contract is the canonical Stock Token.” “Track wallet 0x…”
            “Launch token named Ember ticker EMB.” “List pons launches.”
          </p>
          <p>
            REST: POST /api/v1 with {`{ "tool": "scan_token", "arguments": { "query": "NVDA" } }`} or GET /api/v1/scan_NVDA.
          </p>
        </div>
      </PageFrame>
    </main>
  );
}
