import { PageFrame, PageHero } from "@/components/PageHero";
import { UsagePanel } from "@/components/UsagePanel";
import { TOOLS } from "@/lib/tools";
import { LEGAL, PRODUCT, mcpHttpUrl } from "@/lib/site";

export default function UsagePage() {
  const url = mcpHttpUrl();
  return (
    <main>
      <PageHero compact kicker="Operators" title="Usage" lede={`Updated ${LEGAL.updated}. Canonical MCP ${url}.`} />
      <PageFrame>
        <div className="panel space-y-4 rounded-xl p-6 text-sm leading-relaxed text-ivory/80 sm:p-8">
          <p>
            Point any MCP client at <code className="font-mono text-gold">{url}</code>. No account. {PRODUCT.toolCount}{" "}
            catalog operations; {TOOLS.length} listed. Phantom on /orbit signs pons launches locally.
          </p>
          <UsagePanel />
          <p>Fair use: interactive agent workloads. Bursting thousands of uncached scans per minute may be throttled.</p>
          <p>{LEGAL.data}</p>
          <p>{LEGAL.keys}</p>
        </div>
      </PageFrame>
    </main>
  );
}
